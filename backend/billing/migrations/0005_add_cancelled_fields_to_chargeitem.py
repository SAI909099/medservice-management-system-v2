from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0004_service_has_options_serviceoption'),
    ]

    operations = [
        migrations.AddField(
            model_name='chargeitem',
            name='is_cancelled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='chargeitem',
            name='cancel_note',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='chargeitem',
            name='cancelled_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
