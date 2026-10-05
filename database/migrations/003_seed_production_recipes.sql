-- ApparelFlow ERP
-- Migration 003: Seed production recipes required by the assessment

-- Recipe A: Casual Blouse

INSERT INTO recipes (
    recipe_code,
    name,
    category,
    std_fabric_yards,
    wastage_cap
)
VALUES (
    'REC-BL01',
    'Casual Blouse',
    'Blouse',
    1.8,
    5.0
);

INSERT INTO recipe_components (
    recipe_id,
    component_name,
    pieces_per_garment,
    image_url
)
SELECT
    id,
    component_name,
    pieces_per_garment,
    NULL
FROM recipes
CROSS JOIN (
    VALUES
        ('Front Body Panel', 1),
        ('Back Body Panel', 1),
        ('Sleeves (Left & Right)', 2),
        ('Collar & Stand', 1),
        ('Sleeve Cuffs', 2)
) AS components(component_name, pieces_per_garment)
WHERE recipe_code = 'REC-BL01';


-- Recipe B: Crop Top

INSERT INTO recipes (
    recipe_code,
    name,
    category,
    std_fabric_yards,
    wastage_cap
)
VALUES (
    'REC-CT02',
    'Crop Top',
    'Crop Top',
    1.1,
    8.0
);

INSERT INTO recipe_components (
    recipe_id,
    component_name,
    pieces_per_garment,
    image_url
)
SELECT
    id,
    component_name,
    pieces_per_garment,
    NULL
FROM recipes
CROSS JOIN (
    VALUES
        ('Front Chest Panel', 1),
        ('Back Support Panel', 1),
        ('Neck Binding Strip', 1),
        ('Hem Elastic Casing', 1),
        ('Side Strap Accents', 2)
) AS components(component_name, pieces_per_garment)
WHERE recipe_code = 'REC-CT02';