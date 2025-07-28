from locust import HttpUser, task, between
import json
import os
from prometheus_client import start_http_server

start_http_server(9646)

class DynamicScenarioUser(HttpUser):
    wait_time = between(1, 3)
    host = "http://host.docker.internal:8000/api"
    tasks = []  # Liste vide, à remplir dynamiquement ci-dessous

# ----------- Charger scenarios.json et injecter dynamiquement les tâches -----------

json_path = os.path.join(os.path.dirname(__file__), "scenarios.json")
try:
    with open(json_path, "r") as f:
        scenarios = json.load(f).get("scenarios", [])
except Exception as e:
    print(f"[ERREUR] Impossible de charger scenarios.json : {e}")
    scenarios = []

def create_task_func(scenario):
    method = scenario.get("method", "GET").upper()
    endpoint = scenario["endpoint"]
    payload = scenario.get("payload", {})
    name = scenario.get("name", endpoint)
    # Récupérer headers si défini dans le scénario sinon mettre un header JSON par défaut pour POST
    headers = scenario.get("headers", {})
    if method == "POST" and "Content-Type" not in headers:
        headers["Content-Type"] = "application/json"

    def func(self):
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
    return func

# Ajouter les tâches dynamiquement AVANT l’exécution
from locust import task as task_decorator  # éviter collision avec variable task

for scenario in scenarios:
    weight = scenario.get("weight", 1)
    task_func = create_task_func(scenario)
    DynamicScenarioUser.tasks.append(task_decorator(weight)(task_func))
