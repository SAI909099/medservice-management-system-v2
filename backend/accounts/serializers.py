from django.contrib.auth import get_user_model
from rest_framework import serializers

from doctors.models import Doctor

from .models import Role
from .services import apply_user_page_permissions, get_effective_pages_for_user

User = get_user_model()


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description"]


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    allowed_pages = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "phone",
            "role",
            "clinic",
            "branch",
            "allowed_pages",
        ]

    def get_allowed_pages(self, obj):
        return get_effective_pages_for_user(obj)


class UserCreateSerializer(serializers.ModelSerializer):
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), source="role")
    password = serializers.CharField(write_only=True, min_length=6)
    allowed_pages = serializers.ListField(
        child=serializers.CharField(max_length=50), required=False, allow_empty=True
    )

    class Meta:
        model = User
        fields = [
            "username",
            "password",
            "first_name",
            "last_name",
            "phone",
            "role_id",
            "clinic",
            "branch",
            "allowed_pages",
        ]

    def create(self, validated_data):
        allowed_pages = validated_data.pop("allowed_pages", None)
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        if getattr(user.role, "name", None) == Role.Name.DOCTOR and not hasattr(user, "doctor_profile"):
            Doctor.objects.create(
                user=user,
                clinic=user.clinic,
                branch=user.branch,
                specialty="Umumiy shifokor",
                is_active=True,
            )
        if allowed_pages is not None:
            apply_user_page_permissions(user, allowed_pages)
        return user


class UserPermissionUpdateSerializer(serializers.Serializer):
    allowed_pages = serializers.ListField(child=serializers.CharField(max_length=50), allow_empty=True)

    def update(self, instance, validated_data):
        apply_user_page_permissions(instance, validated_data["allowed_pages"])
        return instance

    def create(self, validated_data):
        raise NotImplementedError


class UserPasswordUpdateSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=6, write_only=True)

    def update(self, instance, validated_data):
        instance.set_password(validated_data["new_password"])
        instance.save(update_fields=["password"])
        return instance

    def create(self, validated_data):
        raise NotImplementedError
