from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0002_expense_note"),
    ]

    operations = [
        migrations.AddField(
            model_name="expense",
            name="source",
            field=models.CharField(
                choices=[("accountant", "Accountant"), ("cash_register", "Cash Register")],
                default="accountant",
                max_length=20,
            ),
        ),
    ]

