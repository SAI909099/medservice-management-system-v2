from collections.abc import Iterable

PAGE_PERMISSIONS = [
    ("dashboard", "Boshqaruv paneli"),
    ("patients", "Bemorlar"),
    ("appointments", "Qabul va navbat"),
    ("doctors", "Shifokorlar"),
    ("lab", "Laboratoriya"),
    ("treatment", "Davolash xonalari"),
    ("billing", "Kassa / Billing"),
    ("pricing", "Xizmat narxlari"),
    ("reports", "Hisobotlar"),
    ("settings_users", "Foydalanuvchilar va ruxsatlar"),
]

ALL_PAGE_CODES = {code for code, _ in PAGE_PERMISSIONS}

ROLE_DEFAULT_PAGES = {
    "super_admin": ALL_PAGE_CODES,
    "admin": ALL_PAGE_CODES,
    "registrator": {"dashboard", "patients", "appointments", "treatment", "reports"},
    "cashier": {"dashboard", "billing", "pricing", "reports", "patients"},
    "doctor": {"dashboard", "doctors", "appointments", "patients", "lab", "reports"},
    "lab_staff": {"dashboard", "lab", "patients"},
    "treatment_staff": {"dashboard", "treatment", "patients"},
}


def sanitize_page_codes(page_codes: Iterable[str]) -> set[str]:
    return {code for code in page_codes if code in ALL_PAGE_CODES}
