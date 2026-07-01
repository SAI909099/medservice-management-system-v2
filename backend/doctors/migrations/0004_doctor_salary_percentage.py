from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('doctors', '0003_alter_doctor_clinic'),
    ]

    operations = [
        migrations.AddField(
            model_name='doctor',
            name='salary_percentage',
            field=models.DecimalField(default=30, max_digits=5, decimal_places=2, help_text='Treatment revenue share percentage (%)'),
        ),
    ]