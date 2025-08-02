import json
import os
import uuid
import random
import string
from locust import HttpUser, task, between
from prometheus_client import start_http_server
from jsonpath_ng import parse

# Start Prometheus metrics server
start_http_server(9646)

# --- Helper Functions for Dynamic Data Generation ---

def generate_random_email():
    """Generates a random email address."""
    return f"user_{uuid.uuid4().hex[:10]}@loadtest.com"

def generate_random_password(length_str="12"):
    """Generates a random password of a given length."""
    length = int(length_str)
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choice(chars) for i in range(length))

def generate_uuid():
    """Generates a standard UUID."""
    return str(uuid.uuid4())

# --- Dictionary to map dynamic directive strings to functions ---

DYNAMIC_FUNCTION_MAP = {
    "email": generate_random_email,
    "password": generate_random_password,
    "uuid": generate_uuid,
}

class DynamicScenarioUser(HttpUser):
    """
    A virtual user that executes test scenarios defined in a JSON file,
    maintaining a context for stateful, multi-step journeys.
    """
    wait_time = between(1, 3)
    # The host is typically set from the Locust UI or startup command,
    # but we keep a default for clarity.
    host = "http://host.docker.internal:8000/api"

    def on_start(self):
        """
        Called once for each virtual user when they are initialized.
        Sets up the user's individual context and loads the test scenarios.
        """
        self.context = {}  # Each user gets a private dictionary for storing state
        json_path = os.path.join(os.path.dirname(__file__), "scenarios.json")
        try:
            with open(json_path, "r") as f:
                self.scenarios = json.load(f).get("scenarios", [])
        except Exception as e:
            print(f"[ERROR] Could not load or parse scenarios.json: {e}")
            self.scenarios = []

    def _substitute_placeholders(self, data_structure):
        """
        Recursively finds and replaces {{variable}} placeholders in strings
        with values from the user's context.
        """
        if isinstance(data_structure, dict):
            return {k: self._substitute_placeholders(v) for k, v in data_structure.items()}
        if isinstance(data_structure, list):
            return [self._substitute_placeholders(i) for i in data_structure]
        if isinstance(data_structure, str):
            # Iterate through context to replace placeholders
            for key, value in self.context.items():
                data_structure = data_structure.replace(f"{{{{{key}}}}}", str(value))
        return data_structure

    @task
    def run_dynamic_scenarios(self):
        """
        The main task that iterates through scenarios and executes them.
        """
        if not self.scenarios:
            return

        for scenario in self.scenarios:
            name = scenario.get("name", "Unnamed Task")

            # 1. GENERATE DYNAMIC DATA (if specified in the scenario)
            if "generate" in scenario:
                for var_name, generator_str in scenario["generate"].items():
                    parts = generator_str.split(":", 1)
                    command = parts[0]
                    if command == "dynamic" and len(parts) > 1:
                        func_parts = parts[1].split("|")
                        func_name = func_parts[0]
                        args = func_parts[1:]
                        if func_name in DYNAMIC_FUNCTION_MAP:
                            self.context[var_name] = DYNAMIC_FUNCTION_MAP[func_name](*args)

            # 2. PREPARE REQUEST by substituting placeholders
            endpoint = self._substitute_placeholders(scenario.get("endpoint", "/"))
            body = self._substitute_placeholders(scenario.get("body", {}))
            headers = self._substitute_placeholders(scenario.get("headers", {}))
            method = scenario.get("method", "GET").upper()

            # 3. EXECUTE REQUEST
            with self.client.request(
                method,
                endpoint,
                json=body if method in ["POST", "PUT", "PATCH"] else None,
                headers=headers,
                name=name,
                catch_response=True # Allows us to manually mark as success/failure
            ) as response:
                # 4. SAVE DATA FROM RESPONSE (if specified and request was successful)
                if response.ok and "save" in scenario:
                    try:
                        response_json = response.json()
                        for var_name, extractor_str in scenario["save"].items():
                            extractor_parts = extractor_str.split(":", 1)
                            source_type = extractor_parts[0]
                            path = extractor_parts[1]

                            if source_type == "json":
                                jsonpath_expr = parse(path)
                                matches = [match.value for match in jsonpath_expr.find(response_json)]
                                if matches:
                                    self.context[var_name] = matches[0] # Save the first match
                                else:
                                    response.failure(f"Save Error: JSONPath '{path}' not found.")
                            # Future extension: Add 'header' source type here
                    except json.JSONDecodeError:
                        response.failure("Response was not valid JSON, cannot save from it.")
                
                # Manual success/failure marking
                if not response.ok:
                    response.failure(f"Got status {response.status_code}")
                else:
                    # If not already failed by a save error, mark as success
                    if not response.failure_reported:
                        response.success()