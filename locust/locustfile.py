from locust import HttpUser, task, between

class ObjectiveUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def get_objectifs(self):
        self.client.get("/objectifs", name="/objectifs [GET]")
