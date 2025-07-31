from locust import HttpUser, task, between
import json
import os
from prometheus_client import start_http_server

start_http_server(9646)

class DynamicScenarioUser(HttpUser):
    wait_time = between(1, 3)
    host = "http://host.docker.internal:8000/api"
    scenarios = []  # Déclaré ici pour être accessible dans la tâche

    def on_start(self):
        # Recharger scenarios.json à chaque lancement de test (nouvel utilisateur)
        json_path = os.path.join(os.path.dirname(__file__), "scenarios.json")
        try:
            with open(json_path, "r") as f:
                self.scenarios = json.load(f).get("scenarios", [])
                print(f"[INFO] {len(self.scenarios)} scénarios chargés.")
        except Exception as e:
            print(f"[ERREUR] Impossible de charger scenarios.json : {e}")
            self.scenarios = []

    @task
    def run_scenarios(self):
        if not self.scenarios:
            print("[WARN] Aucun scénario à exécuter.")
            return

        for scenario in self.scenarios:
            method = scenario.get("method", "GET").upper()
            endpoint = scenario.get("endpoint")
            payload = scenario.get("payload", {})
            name = scenario.get("name", endpoint)
            headers = scenario.get("headers", {})

            if method == "POST" and "Content-Type" not in headers:
                headers["Content-Type"] = "application/json"

            try:
                if method == "GET":
                    self.client.get(endpoint, name=f"{name} [GET]")
                elif method == "POST":
                    self.client.post(endpoint, json=payload, headers=headers, name=f"{name} [POST]")
                elif method == "PUT":
                    self.client.put(endpoint, json=payload, headers=headers, name=f"{name} [PUT]")
                elif method == "DELETE":
                    self.client.delete(endpoint, name=f"{name} [DELETE]")
                else:
                    print(f"[WARN] Méthode {method} non supportée.")
            except Exception as e:
                print(f"[ERREUR] Erreur requête {method} {endpoint} : {e}")
