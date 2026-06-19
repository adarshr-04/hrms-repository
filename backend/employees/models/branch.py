from django.db import models
from .employee import BaseModel


class Branch(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'employees_branch'

    def __str__(self):
        return f"{self.name} - {self.city}" if self.city else self.name
