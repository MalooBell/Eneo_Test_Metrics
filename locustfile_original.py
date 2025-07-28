from locust import HttpUser, task, between

from prometheus_client import start_http_server

start_http_server(9646)
class ObjectiveUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def get_objectives(self):
        self.client.get("/objectifs", name="/objectifs [GET]")