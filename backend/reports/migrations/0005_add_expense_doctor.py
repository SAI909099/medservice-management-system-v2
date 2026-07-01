from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0004_expense_payment_method'),
    ]

    operations = [
        migrations.AddField(
            model_name='expense',
            name='doctor',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='doctors.doctor',
            ),
        ),
    ]
