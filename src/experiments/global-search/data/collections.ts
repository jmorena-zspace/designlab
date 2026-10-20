import type { Collection } from './types'

// Collections: playlists of lessons. All placeholders. `lessonCodes` lists the quick
// launch codes of the lessons inside (they match codes in lessons.ts).
// TO ADD ONE: copy a line and change it. collection(id, name, keywords, lessonCodes)
function collection(id: string, name: string, keywords: string[], lessonCodes: string[]): Collection {
  return { type: 'collection', id: `collection-${id}`, name, keywords, lessonCodes }
}

export const collections: Collection[] = [
  collection('chemistry', 'Chemistry', ['reactions', 'atoms', 'molecules'], ['A701', 'A702', 'A703', 'A704', 'A705', 'A706', 'A708', 'A709']),
  collection('intro-chem', 'Intro to Chemistry', ['atoms', 'matter', 'beginner'], ['A707', 'A708', 'A709', 'A705']),
  collection('electricity', 'Electricity Unit', ['circuits', 'current', 'voltage'], ['A710', 'A711', 'A712', 'A723', 'A714']),
  collection('forces', 'Forces and Motion', ['newton', 'force', 'physics'], ['A715', 'A716', 'A717', 'A719', 'A780']),
  collection('energy', 'Energy All Around Us', ['energy', 'heat', 'renewable'], ['A718', 'A727', 'A762', 'A834']),
  collection('waves', 'Waves, Light and Sound', ['waves', 'light', 'sound'], ['A721', 'A725', 'A726']),
  collection('human-body', 'The Human Body', ['anatomy', 'organs', 'health'], ['A740', 'A741', 'A742', 'A743', 'A744', 'A745']),
  collection('cells', 'Cells and Genetics', ['cell', 'dna', 'biology'], ['A730', 'A731', 'A733', 'A734', 'A747']),
  collection('ecosystems', 'Ecosystems', ['food web', 'habitat', 'environment'], ['A281', 'A735', 'A738', 'A739']),
  collection('insects', 'Bugs and Insects', ['bugs', 'insects', 'elementary'], ['A614', 'A736', 'A738']),
  collection('earth', 'Our Dynamic Earth', ['geology', 'earthquakes', 'volcanoes'], ['A750', 'A751', 'A752', 'A753', 'A760', 'A638']),
  collection('space', 'Space Exploration', ['space', 'planets', 'astronomy'], ['A756', 'A757', 'A758', 'A759', 'A722']),
  collection('weather', 'Weather Watchers', ['weather', 'water cycle', 'climate'], ['A754', 'A755']),
  collection('dinosaurs', 'Dinosaur Discovery', ['dinosaurs', 'fossils', 'elementary'], ['A761', 'A791']),
  collection('fractions', 'Fraction Fun', ['fractions', 'elementary', 'math'], ['A770', 'A771']),
  collection('geometry', 'Geometry in 3D', ['geometry', 'shapes', 'math'], ['A260', 'A396', 'A774', 'A775', 'A776', 'A777', 'A778']),
  collection('k2', 'K-2 Starter Pack', ['kindergarten', 'early learners', 'elementary'], ['A614', 'A261', 'A772', 'A736']),
  collection('writing', 'Writing with 3D', ['writing', 'ela', 'creative'], ['A158', 'A203', 'A790', 'A791', 'A792']),
  collection('ancient', 'Ancient Civilizations', ['history', 'ancient', 'social studies'], ['A800', 'A801', 'A802']),
  collection('us-history', 'American History', ['history', 'presidents', 'social studies'], ['A535', 'A803', 'A805']),
  collection('art', 'Art Studio', ['art', 'sculpture', 'painting'], ['A810', 'A811', 'A812', 'A260']),
  collection('engineering', 'Engineering Design Challenges', ['design', 'stem', 'build'], ['A615', 'A830', 'A831', 'A834']),
  collection('coding', 'Coding Club', ['coding', 'programming', 'computer science'], ['A840', 'A841', 'A842']),
  collection('nursing', 'Nursing Fundamentals', ['nursing', 'clinical', 'health'], ['A821', 'A822', 'A820']),
  collection('automotive', 'Automotive Pathway', ['cars', 'cte', 'mechanic'], ['A850', 'A851', 'A852']),
  collection('manufacturing', 'Advanced Manufacturing', ['manufacturing', 'robotics', 'cte'], ['A854', 'A855', 'A831', 'A832', 'A833']),
  collection('energy-careers', 'Energy and Process Careers', ['process technology', 'oil', 'cte'], ['A856', 'A857', 'A762']),
  collection('favorites', 'Ms. Rivera’s Favorites', ['favorites', 'teacher picks'], ['A740', 'A752', 'A718', 'A710']),
  collection('substitute', 'Substitute Teacher Day', ['sub plans', 'easy', 'quick'], ['A614', 'A757', 'A707']),
  collection('stem-week', 'STEM Week', ['stem', 'event', 'challenge'], ['A615', 'A718', 'A710', 'A730', 'A757']),
]
