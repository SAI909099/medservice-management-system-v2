from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="expense",
            name="note",
            field=models.TextField(blank=True),
        ),
    ]

