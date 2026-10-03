from django.core.validators import RegexValidator
from django.db import migrations, models


def comprobar_telefonos(apps, schema_editor):
    Usuario = apps.get_model('cuentas', 'Usuario')
    # Mantener la comprobación y el cambio de estructura en la misma transacción.
    schema_editor.execute('LOCK TABLE "autenticacion"."usuarios" IN ACCESS EXCLUSIVE MODE')
    invalidos = Usuario.objects.using(schema_editor.connection.alias).exclude(
        models.Q(telefono='') | models.Q(telefono__regex=r'\A3[0-9]{9}\Z')
    )
    ids = list(invalidos.values_list('id', flat=True)[:20])
    if ids:
        raise RuntimeError(
            'Hay celulares que no tienen 10 dígitos o no empiezan por 3. Corrige los usuarios con estos IDs '
            '(se muestran hasta 20) y vuelve a ejecutar migrate: ' + str(ids)
        )


class Migration(migrations.Migration):
    atomic = True
    dependencies = [('cuentas', '0002_validar_telefono')]
    operations = [
        migrations.RunPython(comprobar_telefonos, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='usuario', name='telefono',
            field=models.CharField(max_length=10, blank=True, validators=[
                RegexValidator(regex=r'\A3[0-9]{9}\Z', message='Ingresa un celular de 10 dígitos que empiece por 3.')
            ]),
        ),
        migrations.RemoveConstraint(model_name='usuario', name='ck_usuario_telefono_10_digitos'),
        migrations.AddConstraint(
            model_name='usuario',
            constraint=models.CheckConstraint(
                condition=models.Q(telefono='') | models.Q(telefono__regex=r'\A3[0-9]{9}\Z'),
                name='ck_usuario_telefono_10_digitos',
            ),
        ),
    ]
