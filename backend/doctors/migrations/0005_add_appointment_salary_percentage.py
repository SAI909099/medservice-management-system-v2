from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('doctors', '0004_doctor_salary_percentage'),
    ]

    operations = [
        migrations.AddField(
            model_name='doctor',
            name='appointment_salary_percentage',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                default=0,
                max_digits=5,
            ),
        ),
    ]
