from decimal import Decimal

from rest_framework import serializers

from .models import Charge, ChargeItem, Payment, Receipt, Service
from .services import recalculate_charge, record_payment


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"


class ChargeItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChargeItem
        fields = [
            "id",
            "service",
            "description",
            "quantity",
            "unit_price",
            "total_price",
            "note",
        ]
        extra_kwargs = {
            "total_price": {"required": False},
        }

    def validate(self, attrs):
        quantity = attrs.get("quantity", 1)
        unit_price = attrs.get("unit_price", Decimal("0.00"))
        attrs["total_price"] = quantity * unit_price
        return attrs


class ChargeSerializer(serializers.ModelSerializer):
    items = ChargeItemSerializer(many=True)

    class Meta:
        model = Charge
        fields = [
            "id",
            "patient",
            "appointment",
            "treatment_referral",
            "status",
            "total_amount",
            "paid_amount",
            "notes",
            "items",
            "created_at",
        ]
        read_only_fields = ["status", "total_amount", "created_at"]
        extra_kwargs = {
            "appointment": {"required": False, "allow_null": True},
            "treatment_referral": {"required": False, "allow_null": True},
        }

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        charge = Charge.objects.create(**validated_data)
        for item_data in items_data:
            ChargeItem.objects.create(charge=charge, **item_data)
        return recalculate_charge(charge)

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                ChargeItem.objects.create(charge=instance, **item_data)
        return recalculate_charge(instance)


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"

    def create(self, validated_data):
        charge = validated_data["charge"]
        return record_payment(
            charge=charge,
            amount=validated_data["amount"],
            payment_method=validated_data["payment_method"],
            note=validated_data.get("note", ""),
        )


class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = "__all__"
