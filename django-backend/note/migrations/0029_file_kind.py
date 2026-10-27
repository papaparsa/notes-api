from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('note', '0028_reminder_last_dispatched'),
    ]

    operations = [
        migrations.AddField(
            model_name='file',
            name='kind',
            field=models.CharField(choices=[('upload', 'Upload'), ('drawing', 'Drawing')], db_index=True, default='upload', max_length=20),
        ),
    ]
