from rest_framework import serializers

from .models import Expense
from .services import prepare_expense_payload


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = "__all__"
        read_only_fields = ["created_by", "created_at"]
        extra_kwargs = {
            "clinic": {"required": False, "allow_null": True},
            "branch": {"required": False, "allow_null": True},
        }

    def create(self, validated_data):
        user = self.context["request"].user
        try:
            payload = prepare_expense_payload(user=user, validated_data=validated_data)
        except ValueError as exc:
            raise serializers.ValidationError({"clinic": str(exc)})
        return super().create(payload)

    def update(self, instance, validated_data):
        user = self.context["request"].user
        try:
            payload = prepare_expense_payload(user=user, validated_data=validated_data, existing=instance)
        except ValueError as exc:
            raise serializers.ValidationError({"clinic": str(exc)})
        return super().update(instance, payload)
