-- Sample Collections & Sets for English-Vietnamese Flashcard App
with inserted_collections as (
  insert into public.collections (name)
  values
    ('Unit 1: Daily Essentials'),
    ('IELTS Academic Vocab')
  returning id, name
),
unit1 as (
  select id from inserted_collections where name = 'Unit 1: Daily Essentials'
),
ielts as (
  select id from inserted_collections where name = 'IELTS Academic Vocab'
),
inserted_sets as (
  insert into public.sets (collection_id, title)
  values
    ((select id from unit1), 'Common Verbs & Actions'),
    ((select id from ielts), 'Environment & Society'),
    (null, 'Quick Idioms & Phrases')
  returning id, title
),
set_verbs as (
  select id from inserted_sets where title = 'Common Verbs & Actions'
),
set_ielts as (
  select id from inserted_sets where title = 'Environment & Society'
),
set_idioms as (
  select id from inserted_sets where title = 'Quick Idioms & Phrases'
)
insert into public.cards (set_id, english_word, vietnamese_meaning, example_usage, position)
values
  ((select id from set_verbs), 'accomplish', 'hoàn thành, đạt được', 'She worked hard to accomplish her goals before the deadline.', 1),
  ((select id from set_verbs), 'collaborate', 'hợp tác, cộng tác', 'Our team will collaborate with designers on the new project.', 2),
  ((select id from set_verbs), 'hesitate', 'do dự, ngập ngừng', 'Do not hesitate to ask questions if anything is unclear.', 3),
  ((select id from set_verbs), 'improve', 'cải thiện, nâng cao', 'Practicing every day will quickly improve your pronunciation.', 4),
  ((select id from set_verbs), 'maintain', 'duy trì, giữ gìn', 'It is important to maintain a healthy work-life balance.', 5),
  ((select id from set_verbs), 'organize', 'tổ chức, sắp xếp', 'He uses a digital calendar to organize his weekly schedule.', 6),

  ((select id from set_ielts), 'sustainable', 'bền vững', 'Solar power is a sustainable source of energy for future generations.', 1),
  ((select id from set_ielts), 'mitigate', 'làm dịu, giảm nhẹ', 'Planting more trees can help mitigate the effects of urban heat.', 2),
  ((select id from set_ielts), 'ubiquitous', 'có mặt ở khắp nơi', 'Smartphones have become ubiquitous in modern daily life.', 3),
  ((select id from set_ielts), 'resilient', 'kiên cường, có khả năng phục hồi', 'Coastal communities must build resilient infrastructure against storms.', 4),
  ((select id from set_ielts), 'alleviate', 'làm giảm bớt, xoa dịu', 'Community programs aim to alleviate poverty in rural areas.', 5),
  ((select id from set_ielts), 'inevitable', 'không thể tránh khỏi', 'Technological change is an inevitable part of economic growth.', 6),

  ((select id from set_idioms), 'break the ice', 'phá tan bầu không khí ngại ngùng', 'We played a quick game to break the ice at the start of the workshop.', 1),
  ((select id from set_idioms), 'piece of cake', 'dễ như ăn bánh', 'After studying all week, the grammar quiz felt like a piece of cake.', 2),
  ((select id from set_idioms), 'hit the books', 'bắt đầu học hành chăm chỉ', 'Final exams are next Monday, so I need to hit the books tonight.', 3);
