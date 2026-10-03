from django.core.validators import RegexValidator
from django.db import migrations, models


def comprobar_telefonos(apps, schema_editor):
    Usuario = apps.get_model('cuentas', 'Usuario')
    # Mantener la comprobación y el cambio de estructura en la misma transacción.
    schema_editor.execute('LOCK TABLE "autenticacion"."usuarios" IN ACCESS EXCLUSIVE MODE')
    invalidos = Usuario.objects.using(schema_editor.connection.alias).exclude(
        models.Q(telefono='') | models.Q(telefono__regex=r'\A[0-9]{10}\Z')
    )
    ids = list(invalidos.values_list('id', flat=True)[:20])
    if ids:
        raise RuntimeError(
            'Hay teléfonos inválidos. Corrige los usuarios con estos IDs '
            '(se muestran hasta 20) y vuelve a ejecutar migrate: ' + str(ids)
        )


class Migration(migrations.Migration):
    atomic = True
    dependencies = [('cuentas', '0001_initial')]
    operations = [
        migrations.RunPython(comprobar_telefonos, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='usuario', name='telefono',
            field=models.CharField(max_length=10, blank=True, validators=[
                RegexValidator(regex=r'\A[0-9]{10}\Z', message='Ingresa un teléfono de 10 dígitos.')
            ]),
        ),
        migrations.AddConstraint(
            model_name='usuario',
            constraint=models.CheckConstraint(
                condition=models.Q(telefono='') | models.Q(telefono__regex=r'\A[0-9]{10}\Z'),
                name='ck_usuario_telefono_10_digitos',
            ),
        ),
    ]
