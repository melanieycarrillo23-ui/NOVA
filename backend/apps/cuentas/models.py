from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone


class UsuarioManager(BaseUserManager):
    def create_user(self, correo, password=None, **extra_fields):
        if not correo:
            raise ValueError('El correo es obligatorio.')
        correo = self.normalize_email(correo)
        usuario = self.model(correo=correo, **extra_fields)
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, correo, password=None, **extra_fields):
        extra_fields.setdefault('es_staff_django', True)
        extra_fields.setdefault('es_superusuario', True)
        extra_fields.setdefault('estado', Usuario.Estado.ACTIVO)
        if not extra_fields.get('es_staff_django') or not extra_fields.get('es_superusuario'):
            raise ValueError('El superusuario requiere permisos administrativos.')
        return self.create_user(correo, password, **extra_fields)


class Usuario(AbstractBaseUser):
    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        BLOQUEADO = 'BLOQUEADO', 'Bloqueado'
        INACTIVO = 'INACTIVO', 'Inactivo'

    nombre_completo = models.CharField(max_length=150)
    correo = models.EmailField(max_length=254, unique=True)
    telefono = models.CharField(max_length=10, blank=True, validators=[RegexValidator(regex=r'\A3[0-9]{9}\Z', message='Ingresa un celular de 10 dígitos que empiece por 3.')])
    url_imagen_perfil = models.URLField(max_length=500, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO, db_index=True)
    es_staff_django = models.BooleanField(default=False)
    es_superusuario = models.BooleanField(default=False)
    creado_en = models.DateTimeField(default=timezone.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'correo'
    REQUIRED_FIELDS = ['nombre_completo']

    class Meta:
        db_table = '"autenticacion"."usuarios"'
        ordering = ['nombre_completo']
        constraints = [models.CheckConstraint(condition=models.Q(telefono='') | models.Q(telefono__regex=r'\A3[0-9]{9}\Z'), name='ck_usuario_telefono_10_digitos')]

    @property
    def is_staff(self):
        return self.es_staff_django

    @property
    def is_active(self):
        return self.estado == self.Estado.ACTIVO

    @property
    def is_superuser(self):
        return self.es_superusuario

    def has_perm(self, perm, obj=None):
        return self.es_superusuario

    def has_module_perms(self, app_label):
        return self.es_superusuario

    def __str__(self):
        return f'{self.nombre_completo} <{self.correo}>'


class Rol(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=60)
    descripcion = models.CharField(max_length=255, blank=True)
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = '"autenticacion"."roles"'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Permiso(models.Model):
    codigo = models.CharField(max_length=80, unique=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=255, blank=True)
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = '"autenticacion"."permisos"'
        ordering = ['codigo']

    def __str__(self):
        return self.codigo


class UsuarioRol(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='asignaciones_roles')
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name='asignaciones_usuarios')
    asignado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = '"autenticacion"."usuario_roles"'
        constraints = [models.UniqueConstraint(fields=['usuario', 'rol'], name='uq_usuario_rol')]


class RolPermiso(models.Model):
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name='asignaciones_permisos')
    permiso = models.ForeignKey(Permiso, on_delete=models.CASCADE, related_name='asignaciones_roles')

    class Meta:
        db_table = '"autenticacion"."rol_permisos"'
        constraints = [models.UniqueConstraint(fields=['rol', 'permiso'], name='uq_rol_permiso')]


class SesionRefresh(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='sesiones_refresh')
    hash_token = models.CharField(max_length=255, unique=True)
    expira_en = models.DateTimeField()
    revocado_en = models.DateTimeField(null=True, blank=True)
    agente_usuario = models.CharField(max_length=500, blank=True)
    direccion_ip = models.GenericIPAddressField(null=True, blank=True)
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = '"autenticacion"."sesiones_refresh"'
