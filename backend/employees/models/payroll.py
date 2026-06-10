from django.db import models
from .employee import BaseModel, Employee


class Payroll(BaseModel):
    PAYMENT_MODES = [
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CASH', 'Cash'),
        ('CHEQUE', 'Cheque'),
    ]

    PAYMENT_STATUS = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('VOID', 'Void'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payroll_records')
    pay_period_start = models.DateField()
    pay_period_end = models.DateField()
    
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    net_pay = models.DecimalField(max_digits=12, decimal_places=2)
    pay_date = models.DateField()
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODES, default='BANK_TRANSFER')
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='PENDING')

    class Meta:
        verbose_name_plural = "Payroll"
        db_table = 'payroll_payroll'

    def __str__(self):
        return f"{self.employee.employee_id} - {self.pay_period_start} to {self.pay_period_end}"
