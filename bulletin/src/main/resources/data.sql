-- 중복 방지: 이미 데이터 있으면 삽입 안 함
INSERT INTO categories (name, type)
SELECT name, type FROM (VALUES
    ('웹개발', 'DOMAIN'),
    ('앱개발', 'DOMAIN'),
    ('AI·ML', 'DOMAIN'),
    ('게임', 'DOMAIN'),
    ('데이터', 'DOMAIN'),
    ('기타', 'DOMAIN'),
    ('토이프로젝트', 'PROJECT_TYPE'),
    ('팀프로젝트', 'PROJECT_TYPE'),
    ('해커톤', 'PROJECT_TYPE'),
    ('오픈소스', 'PROJECT_TYPE')
) AS v(name, type)
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE categories.name = v.name);