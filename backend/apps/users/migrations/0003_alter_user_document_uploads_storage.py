# Generated manually for Cloudinary raw document storage

from django.db import migrations, models
import cloudinary_storage.storage


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_user_website_url"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="document_uploads",
            field=models.FileField(
                blank=True,
                null=True,
                storage=cloudinary_storage.storage.RawMediaCloudinaryStorage(),
                upload_to="documents/",
            ),
        ),
    ]
