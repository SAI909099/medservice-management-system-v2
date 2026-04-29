from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0004_servicequeueticket_referring_doctor"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReferringDoctor",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=200)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("clinic_name", models.CharField(blank=True, max_length=200, verbose_name="Klinika nomi")),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["full_name"],
            },
        ),
    ]