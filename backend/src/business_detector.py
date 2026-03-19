"""Business type detection using rule-based keyword matching."""
from typing import Dict, List, Tuple

# ---------------------------------------------------------------------------
# Business category definitions with keywords
# ---------------------------------------------------------------------------

BUSINESS_CATEGORIES: Dict[str, List[str]] = {
    # Healthcare
    "hospital_clinic": [
        "hospital", "clinic", "urgent care", "medical center", "health center",
        "outpatient", "emergency room", "er", "healthcare",
    ],
    "dental": [
        "dental", "dentist", "orthodontist", "orthodontic", "teeth", "oral",
        "endodontics", "periodontist", "denture",
    ],
    "mental_health_therapy": [
        "therapy", "therapist", "counseling", "counselor", "psychiatry",
        "psychiatrist", "psychologist", "psychology", "mental health",
        "behavioral health", "life coach", "coaching",
    ],
    "physical_therapy": [
        "physical therapy", "physiotherapy", "physiotherapist", "rehab",
        "rehabilitation", "occupational therapy", "speech therapy",
        "chiropractic", "chiropractor",
    ],
    "veterinary": [
        "vet", "veterinary", "veterinarian", "animal hospital", "pet clinic",
        "animal care", "pet hospital",
    ],
    "specialty_medical": [
        "dermatology", "dermatologist", "cardiology", "cardiologist",
        "neurology", "neurologist", "orthopedic", "ophthalmology",
        "optometrist", "optician", "radiology", "oncology",
        "gynecology", "urology", "podiatry", "podiatrist",
    ],
    "fertility": [
        "fertility", "ivf", "reproductive", "obstetrics", "obstetrician",
        "midwife", "midwifery",
    ],
    # Beauty & Wellness
    "hair_salon": [
        "hair salon", "hair studio", "barbershop", "barber", "hairdresser",
        "hair stylist", "beauty salon", "hair care", "blowout", "braids",
    ],
    "nail_salon": [
        "nail salon", "nail studio", "manicure", "pedicure", "nail art",
        "gel nails", "acrylic nails",
    ],
    "spa_massage": [
        "spa", "massage", "massage therapy", "day spa", "wellness spa",
        "facial", "body treatment", "aromatherapy", "deep tissue",
        "swedish massage", "hot stone",
    ],
    "fitness_gym": [
        "gym", "fitness", "fitness center", "crossfit", "personal trainer",
        "personal training", "strength training", "weightlifting",
        "bootcamp", "boot camp", "group fitness",
    ],
    "yoga_pilates": [
        "yoga", "pilates", "meditation", "mindfulness", "barre",
        "studio", "hot yoga", "vinyasa", "hatha",
    ],
    "tattoo_piercing": [
        "tattoo", "piercing", "ink", "body art", "tattoo studio",
        "tattoo parlor",
    ],
    "cosmetology": [
        "cosmetology", "esthetics", "esthetician", "waxing", "threading",
        "eyebrow", "lash", "eyelash", "makeup artist", "microblading",
    ],
    # Professional Services
    "law_firm": [
        "law", "lawyer", "attorney", "legal", "solicitor", "barrister",
        "law firm", "legal services", "notary",
    ],
    "accounting_tax": [
        "accounting", "accountant", "tax", "cpa", "bookkeeping",
        "bookkeeper", "financial advisor", "tax preparation", "audit",
    ],
    "consulting": [
        "consulting", "consultant", "advisory", "strategy", "management consulting",
        "business consulting", "it consulting",
    ],
    "real_estate": [
        "real estate", "realtor", "property", "mortgage", "broker",
        "housing", "rental", "realty",
    ],
    "insurance": [
        "insurance", "insurer", "broker", "underwriting", "claims",
        "life insurance", "health insurance",
    ],
    "hr_recruitment": [
        "recruitment", "staffing", "hr", "human resources", "headhunter",
        "talent acquisition", "executive search",
    ],
    # Hospitality & Dining
    "restaurant_cafe": [
        "restaurant", "cafe", "coffee shop", "diner", "bistro", "eatery",
        "food", "cuisine", "bakery", "bake", "catering",
    ],
    "hotel": [
        "hotel", "motel", "inn", "lodge", "resort", "bed and breakfast",
        "b&b", "hostel", "accommodation",
    ],
    "event_planning": [
        "event", "event planning", "event planner", "wedding", "catering",
        "venue", "party planning",
    ],
    "travel_agency": [
        "travel", "travel agency", "tour", "tourism", "holiday", "vacation",
        "cruise", "flights",
    ],
    # Education
    "tutoring": [
        "tutor", "tutoring", "academic", "homework help", "study",
        "test prep", "sat", "act",
    ],
    "language_school": [
        "language", "english school", "esl", "french lessons", "spanish lessons",
        "lingua", "translation",
    ],
    "music_lessons": [
        "music", "piano", "guitar", "violin", "drum", "singing",
        "vocal", "music school", "music lessons",
    ],
    "coding_bootcamp": [
        "coding", "programming", "software", "bootcamp", "web development",
        "computer science", "it training",
    ],
    # Home & Trade Services
    "plumbing_hvac": [
        "plumbing", "plumber", "hvac", "heating", "cooling", "air conditioning",
        "furnace", "boiler", "pipe",
    ],
    "electrical": [
        "electrical", "electrician", "wiring", "solar", "generator",
        "lighting installation",
    ],
    "cleaning": [
        "cleaning", "cleaner", "maid", "janitorial", "housekeeping",
        "carpet cleaning", "window cleaning",
    ],
    "landscaping": [
        "landscaping", "lawn", "gardening", "garden", "tree service",
        "snow removal", "irrigation",
    ],
    "home_repair": [
        "handyman", "home repair", "renovation", "contractor", "construction",
        "painting", "roofing", "flooring", "carpentry",
    ],
    "car_service": [
        "auto", "car", "mechanic", "automotive", "oil change", "tire",
        "brake", "detailing", "car wash",
    ],
    "pet_grooming": [
        "pet grooming", "dog grooming", "dog walker", "pet sitting",
        "kennel", "pet care",
    ],
    # Other
    "photography_videography": [
        "photography", "photographer", "videography", "videographer",
        "photo studio", "portrait", "wedding photography",
    ],
    "personal_training": [
        "personal training", "personal trainer", "nutrition", "nutritionist",
        "dietitian", "weight loss",
    ],
    "repair_services": [
        "repair", "fix", "electronics repair", "phone repair",
        "computer repair", "appliance repair", "watch repair",
    ],
}

# Human-readable labels
CATEGORY_LABELS: Dict[str, str] = {
    "hospital_clinic": "Hospital / Clinic",
    "dental": "Dental Practice",
    "mental_health_therapy": "Mental Health & Therapy",
    "physical_therapy": "Physical Therapy",
    "veterinary": "Veterinary",
    "specialty_medical": "Specialty Medical",
    "fertility": "Fertility / Obstetrics",
    "hair_salon": "Hair Salon / Barbershop",
    "nail_salon": "Nail Salon",
    "spa_massage": "Spa & Massage",
    "fitness_gym": "Fitness & Gym",
    "yoga_pilates": "Yoga & Pilates",
    "tattoo_piercing": "Tattoo & Piercing",
    "cosmetology": "Cosmetology & Aesthetics",
    "law_firm": "Law Firm",
    "accounting_tax": "Accounting & Tax",
    "consulting": "Consulting",
    "real_estate": "Real Estate",
    "insurance": "Insurance",
    "hr_recruitment": "HR & Recruitment",
    "restaurant_cafe": "Restaurant / Café",
    "hotel": "Hotel & Accommodation",
    "event_planning": "Event Planning",
    "travel_agency": "Travel Agency",
    "tutoring": "Tutoring & Education",
    "language_school": "Language School",
    "music_lessons": "Music Lessons",
    "coding_bootcamp": "Coding & Tech Training",
    "plumbing_hvac": "Plumbing & HVAC",
    "electrical": "Electrical Services",
    "cleaning": "Cleaning Services",
    "landscaping": "Landscaping & Gardening",
    "home_repair": "Home Repair & Renovation",
    "car_service": "Car Service & Auto",
    "pet_grooming": "Pet Grooming & Care",
    "photography_videography": "Photography & Videography",
    "personal_training": "Personal Training & Nutrition",
    "repair_services": "Repair Services",
}


def detect_business_type(name: str, description: str = "") -> Tuple[str, float, Dict[str, float]]:
    """
    Detect the business type from a business name and optional description.

    Returns:
        (best_category, confidence_score, all_scores_dict)
    """
    text = f"{name} {description}".lower()
    scores: Dict[str, float] = {}

    for category, keywords in BUSINESS_CATEGORIES.items():
        matched = 0
        for kw in keywords:
            if kw in text:
                # Longer keyword matches are weighted more
                matched += len(kw.split())
        if matched:
            # Normalise by number of keywords so niche categories aren't penalised
            scores[category] = round(matched / (len(keywords) + 1), 4)

    if not scores:
        return "other", 0.0, {}

    best = max(scores, key=lambda k: scores[k])
    best_score = scores[best]

    # Normalise confidence to 0–1 range using softmax-like scaling
    # Cap confidence at 0.95
    total = sum(scores.values())
    confidence = round(min(scores[best] / total, 0.95), 4) if total > 0 else 0.0

    # Return normalised scores
    normalised = {k: round(v / total, 4) for k, v in scores.items()} if total > 0 else scores
    return best, confidence, normalised


def get_category_label(category: str) -> str:
    """Return human-readable label for a category key."""
    return CATEGORY_LABELS.get(category, category.replace("_", " ").title())


def list_categories() -> Dict[str, str]:
    """Return all categories with their labels."""
    return dict(CATEGORY_LABELS)
