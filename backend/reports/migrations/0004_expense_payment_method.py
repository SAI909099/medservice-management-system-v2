from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0003_expense_source"),
    ]

    operations = [
        migrations.AddField(
            model_name="expense",
            name="payment_method",
            field=models.CharField(
                blank=True,
                choices=[("cash", "Cash"), ("card", "Card"), ("transfer", "Transfer")],
                default="cash",
                max_length=20,
            ),
        ),
    ]