import type { Lesson } from './types'

// Lessons. The first ten names/codes come from go.zspace.com/lessons; the rest are
// placeholders written to feel real. The application must match an app's name in apps.ts.
// TO ADD ONE: copy a line and change it. lesson(name, code, subject, application, keywords)
function lesson(name: string, code: string, subject: string, application: string, keywords: string[]): Lesson {
  return { type: 'lesson', id: `lesson-${code}`, name, code, subject, application, keywords }
}

export const lessons: Lesson[] = [
  // ---------- From zCentral ----------
  lesson('1, 2, 3 Counting Bugs!', 'A614', 'Mathematics', 'Studio', ['counting', 'insects', 'numbers', 'kindergarten']),
  lesson('3D Building Design: Earthquake Challenge', 'A615', 'Engineering', 'Tinkercad', ['earthquake', 'structures', 'design']),
  lesson('3D Figures: Volume and Surface Area', 'A396', 'Mathematics', "Newton's Park A3", ['volume', 'surface area', 'geometry']),
  lesson('3D Solids', 'A260', 'Arts', 'Studio', ['shapes', 'cube', 'sphere', 'cone']),
  lesson('A Fish Fillet to Trade', 'A158', 'English Language Arts', 'Studio', ['story', 'trade', 'reading']),
  lesson('A Statuesque Castle', 'A203', 'English Language Arts', 'Studio', ['castle', 'writing', 'description']),
  lesson('ABCs and 123s', 'A261', 'English Language Arts', 'Studio', ['alphabet', 'letters', 'numbers']),
  lesson('Abiotic vs. Biotic Factors', 'A281', 'Life Science', 'Studio', ['ecosystem', 'living', 'nonliving']),
  lesson('Abraham Lincoln', 'A535', 'Social Science', 'Studio', ['president', 'civil war', 'history']),
  lesson('Accident Investigator', 'A466', 'Physical Science', "Newton's Park A3", ['collisions', 'momentum', 'forensics']),
  lesson('Chemistry of Caves', 'A638', 'Earth and Space Science', 'Studio', ['caves', 'limestone', 'stalactites', 'erosion']),

  // ---------- Physical Science ----------
  lesson('Electricity and Chemistry', 'A701', 'Physical Science', 'Scholarlab Simulations: Electricity and Chemistry', ['electrochemistry', 'batteries', 'redox']),
  lesson('Solid State Chemistry', 'A702', 'Physical Science', 'Scholarlab Simulations: Solid State Chemistry', ['crystals', 'lattice', 'solids']),
  lesson('Acids and Bases', 'A703', 'Physical Science', 'Scholarlab Simulations: Acids and Bases', ['ph', 'indicator', 'neutralization']),
  lesson('Titration Basics', 'A704', 'Physical Science', 'Scholarlab Pro by Scholarlab', ['titration', 'acids', 'burette']),
  lesson('Chemical Reactions', 'A705', 'Physical Science', 'Scholarlab Pro by Scholarlab', ['reactions', 'reactants', 'products', 'chemistry']),
  lesson('Balancing Chemical Equations', 'A706', 'Physical Science', 'Scholarlab Pro by Scholarlab', ['equations', 'atoms', 'conservation of mass', 'chemistry']),
  lesson('States of Matter', 'A707', 'Physical Science', 'Experiences', ['solid', 'liquid', 'gas', 'particles']),
  lesson('Building Atoms', 'A708', 'Physical Science', 'Studio', ['protons', 'neutrons', 'electrons', 'chemistry']),
  lesson('The Periodic Table', 'A709', 'Physical Science', 'Studio', ['elements', 'groups', 'periods', 'chemistry']),
  lesson('Simple Circuits', 'A710', 'Physical Science', "Franklin's Lab A3", ['circuits', 'battery', 'bulb', 'electricity']),
  lesson('Series and Parallel Circuits', 'A711', 'Physical Science', "Franklin's Lab A3", ['series', 'parallel', 'current', 'electricity']),
  lesson("Ohm's Law", 'A712', 'Physical Science', "Franklin's Lab A3", ['voltage', 'resistance', 'current']),
  lesson('Magnets and Magnetic Fields', 'A713', 'Physical Science', "Franklin's Lab A3", ['magnetism', 'poles', 'field lines']),
  lesson('Electromagnets', 'A714', 'Physical Science', "Franklin's Lab A3", ['coil', 'magnetism', 'electricity']),
  lesson("Newton's First Law", 'A715', 'Physical Science', "Newton's Park A3", ['inertia', 'force', 'motion']),
  lesson("Newton's Second Law", 'A716', 'Physical Science', "Newton's Park A3", ['acceleration', 'mass', 'force']),
  lesson("Newton's Third Law", 'A717', 'Physical Science', "Newton's Park A3", ['action', 'reaction', 'force']),
  lesson('Roller Coaster Energy', 'A718', 'Physical Science', "Newton's Park A3", ['potential energy', 'kinetic energy', 'roller coaster']),
  lesson('Friction on Ramps', 'A719', 'Physical Science', "Newton's Park A3", ['friction', 'incline', 'ramps']),
  lesson('Pendulum Motion', 'A720', 'Physical Science', 'zSpace Physics', ['pendulum', 'period', 'oscillation']),
  lesson('Sound Waves', 'A721', 'Physical Science', 'zSpace Physics', ['sound', 'frequency', 'amplitude', 'waves']),
  lesson('Satellites in Orbit', 'A722', 'Physical Science', 'zSpace Physics', ['orbit', 'gravity', 'satellites']),
  lesson('Static Electricity', 'A723', 'Physical Science', 'zSpace Physics', ['static', 'charge', 'electrons']),
  lesson('Work and Simple Machines', 'A724', 'Physical Science', 'zSpace Physics', ['lever', 'pulley', 'work']),
  lesson('Light and Lenses', 'A725', 'Physical Science', 'Scholarlab Simulations: Optics', ['lenses', 'refraction', 'light', 'optics']),
  lesson('Mirrors and Reflection', 'A726', 'Physical Science', 'Scholarlab Simulations: Optics', ['mirrors', 'reflection', 'light']),
  lesson('Heat Transfer', 'A727', 'Physical Science', 'Experiences', ['conduction', 'convection', 'radiation', 'heat']),

  // ---------- Life Science ----------
  lesson('Animal Cells', 'A730', 'Life Science', 'Studio', ['cell', 'nucleus', 'mitochondria', 'organelles']),
  lesson('Plant Cells', 'A731', 'Life Science', 'Studio', ['cell', 'chloroplast', 'cell wall', 'organelles']),
  lesson('Photosynthesis', 'A732', 'Life Science', 'Studio', ['plants', 'sunlight', 'glucose', 'chloroplast']),
  lesson('DNA and Genes', 'A733', 'Life Science', 'Studio', ['dna', 'genetics', 'double helix']),
  lesson('Mitosis', 'A734', 'Life Science', 'Visible Body+', ['cell division', 'chromosomes', 'cell cycle']),
  lesson('Food Webs', 'A735', 'Life Science', 'Studio', ['ecosystem', 'predator', 'prey', 'energy']),
  lesson('Life Cycle of a Butterfly', 'A736', 'Life Science', 'Studio', ['metamorphosis', 'caterpillar', 'insects']),
  lesson('Frog Dissection', 'A737', 'Life Science', 'Studio', ['frog', 'dissection', 'organs', 'amphibian']),
  lesson('Pollination', 'A738', 'Life Science', 'Studio', ['bees', 'flowers', 'plants', 'insects']),
  lesson('Animal Adaptations', 'A739', 'Life Science', 'Studio', ['adaptation', 'habitat', 'survival']),
  lesson('Human Heart', 'A740', 'Life Science', 'Visible Body+', ['heart', 'circulation', 'blood', 'anatomy']),
  lesson('The Respiratory System', 'A741', 'Life Science', 'Visible Body+', ['lungs', 'breathing', 'anatomy']),
  lesson('The Digestive System', 'A742', 'Life Science', 'BioDigital Human zSpace', ['stomach', 'intestines', 'anatomy']),
  lesson('The Skeletal System', 'A743', 'Life Science', 'BioDigital Human zSpace', ['bones', 'skeleton', 'skull', 'anatomy']),
  lesson('The Nervous System', 'A744', 'Life Science', 'BioDigital Human zSpace', ['brain', 'neurons', 'spinal cord', 'anatomy']),
  lesson('The Human Eye', 'A745', 'Life Science', 'Visible Body+', ['eye', 'vision', 'lens', 'anatomy']),
  lesson('Microorganisms', 'A746', 'Life Science', 'Studio', ['bacteria', 'virus', 'microscope']),
  lesson('Inherited Traits', 'A747', 'Life Science', 'Studio', ['heredity', 'genetics', 'traits']),

  // ---------- Earth and Space Science ----------
  lesson('Layers of the Earth', 'A750', 'Earth and Space Science', 'Studio', ['crust', 'mantle', 'core', 'geology']),
  lesson('Plate Tectonics', 'A751', 'Earth and Space Science', 'Studio', ['plates', 'earthquakes', 'continents', 'geology']),
  lesson('How Volcanoes Work', 'A752', 'Earth and Space Science', 'Studio', ['volcano', 'magma', 'lava', 'eruption']),
  lesson('The Rock Cycle', 'A753', 'Earth and Space Science', 'Studio', ['igneous', 'sedimentary', 'metamorphic', 'rocks']),
  lesson('The Water Cycle', 'A754', 'Earth and Space Science', 'Studio', ['evaporation', 'condensation', 'precipitation']),
  lesson('Weather and Climate', 'A755', 'Earth and Space Science', 'Experiences', ['weather', 'climate', 'atmosphere']),
  lesson('Phases of the Moon', 'A756', 'Earth and Space Science', 'Studio', ['moon', 'lunar', 'phases']),
  lesson('The Solar System', 'A757', 'Earth and Space Science', 'Studio', ['planets', 'sun', 'orbit', 'space']),
  lesson('Seasons on Earth', 'A758', 'Earth and Space Science', 'Studio', ['seasons', 'tilt', 'axis', 'sun']),
  lesson('Stars and Galaxies', 'A759', 'Earth and Space Science', 'Studio', ['stars', 'galaxy', 'milky way', 'space']),
  lesson('Erosion and Deposition', 'A760', 'Earth and Space Science', 'Studio', ['erosion', 'rivers', 'sediment']),
  lesson('Fossils and Earth History', 'A761', 'Earth and Space Science', 'Studio', ['fossils', 'dinosaurs', 'geologic time']),
  lesson('Renewable Energy Sources', 'A762', 'Earth and Space Science', 'Renewable Energy Fundamentals', ['solar', 'wind', 'hydro', 'energy']),

  // ---------- Mathematics ----------
  lesson('Fractions on a Number Line', 'A770', 'Mathematics', 'Math Island A3', ['fractions', 'number line']),
  lesson('Equivalent Fractions', 'A771', 'Mathematics', 'Math Island A3', ['fractions', 'equivalent']),
  lesson('Place Value Castle', 'A772', 'Mathematics', 'Math Island A3', ['place value', 'tens', 'ones']),
  lesson('Multiplication Arrays', 'A773', 'Mathematics', 'Math Island A3', ['multiplication', 'arrays', 'times tables']),
  lesson('Area and Perimeter', 'A774', 'Mathematics', "Euclid's Shapes", ['area', 'perimeter', 'rectangles']),
  lesson('Nets of 3D Shapes', 'A775', 'Mathematics', "Euclid's Shapes", ['nets', 'cube', 'prism', 'geometry']),
  lesson('Angles and Triangles', 'A776', 'Mathematics', "Euclid's Shapes", ['angles', 'triangles', 'geometry']),
  lesson('Pythagorean Theorem', 'A777', 'Mathematics', "Euclid's Shapes", ['right triangle', 'hypotenuse', 'geometry']),
  lesson('Cross Sections', 'A778', 'Mathematics', "Euclid's Shapes", ['slices', 'solids', 'geometry']),
  lesson('Symmetry', 'A779', 'Mathematics', "Euclid's Shapes", ['reflection', 'symmetry', 'shapes']),
  lesson('Graphing Motion', 'A780', 'Mathematics', "Newton's Park A3", ['graphs', 'slope', 'speed']),
  lesson('Probability with Dice', 'A781', 'Mathematics', 'Experiences', ['probability', 'dice', 'chance']),

  // ---------- English Language Arts & Social Science ----------
  lesson('Story Settings', 'A790', 'English Language Arts', 'Studio', ['setting', 'writing', 'story']),
  lesson('Descriptive Writing: Dinosaurs', 'A791', 'English Language Arts', 'Studio', ['adjectives', 'dinosaurs', 'writing']),
  lesson('Poetry in 3D', 'A792', 'English Language Arts', 'Studio', ['poetry', 'imagery', 'writing']),
  lesson('Ancient Egypt', 'A800', 'Social Science', 'Studio', ['pyramids', 'pharaohs', 'history']),
  lesson('Ancient Rome', 'A801', 'Social Science', 'Studio', ['colosseum', 'empire', 'history']),
  lesson('Ancient Greece', 'A802', 'Social Science', 'Studio', ['parthenon', 'democracy', 'history']),
  lesson('The Industrial Revolution', 'A803', 'Social Science', 'Studio', ['steam engine', 'factories', 'history']),
  lesson('Landforms and Maps', 'A804', 'Social Science', 'Studio', ['geography', 'maps', 'landforms']),
  lesson('Explorers and Ships', 'A805', 'Social Science', 'Studio', ['ships', 'exploration', 'history']),

  // ---------- Arts ----------
  lesson('Sculpting a Character', 'A810', 'Arts', 'ShapeLab', ['sculpture', 'character', 'clay']),
  lesson('Painting in Space', 'A811', 'Arts', 'Tilt Brush', ['painting', 'brushes', 'color']),
  lesson('Color Theory', 'A812', 'Arts', 'Tilt Brush', ['color wheel', 'hue', 'contrast']),

  // ---------- Health Science ----------
  lesson('Reading an ECG', 'A820', 'Health Science', 'Virtual ECG', ['heart', 'ecg', 'rhythm']),
  lesson('Taking Vital Signs', 'A821', 'Health Science', 'Clinical Skills Labs', ['pulse', 'blood pressure', 'nursing']),
  lesson('Hand Hygiene', 'A822', 'Health Science', 'Clinical Skills Labs', ['infection control', 'nursing']),
  lesson('Tooth Anatomy', 'A823', 'Health Science', 'Dental', ['teeth', 'enamel', 'dentistry']),
  lesson('Muscles of Movement', 'A824', 'Health Science', 'Visible Body+', ['muscles', 'movement', 'anatomy']),

  // ---------- Engineering & Computer Science ----------
  lesson('Design a Bridge', 'A830', 'Engineering', 'Tinkercad', ['bridge', 'truss', 'structures']),
  lesson('Gear Ratios', 'A831', 'Engineering', 'Applied Mechanical', ['gears', 'ratio', 'torque']),
  lesson('Hydraulic Lift', 'A832', 'Engineering', 'Applied Hydraulics', ['hydraulics', 'pressure', 'lift']),
  lesson('Pneumatic Cylinders', 'A833', 'Engineering', 'Applied Pneumatics', ['pneumatics', 'air', 'cylinder']),
  lesson('Build a Wind Turbine', 'A834', 'Engineering', 'Renewable Energy Fundamentals', ['wind', 'turbine', 'energy']),
  lesson('Intro to Coding', 'A840', 'Computer Science', 'Computer Science Essentials', ['coding', 'algorithms', 'loops']),
  lesson('Staying Safe Online', 'A841', 'Computer Science', 'Computer Science Essentials', ['online safety', 'passwords', 'privacy']),
  lesson('Your First Unity Scene', 'A842', 'Computer Science', 'Unity Programming', ['unity', 'game', 'scene']),
  lesson('Exploring Data in 3D', 'A843', 'Computer Science', 'Visualizer', ['data', 'charts', 'visualization']),

  // ---------- Career and Technical Education ----------
  lesson('Engine Basics', 'A850', 'Career and Technical Education', 'Automotive Structure Technology', ['engine', 'pistons', 'automotive']),
  lesson('Changing Brake Pads', 'A851', 'Career and Technical Education', 'Automotive Maintenance and Repair', ['brakes', 'automotive', 'repair']),
  lesson('EV Battery Safety', 'A852', 'Career and Technical Education', 'Electric Vehicle Maintenance', ['battery', 'ev', 'safety']),
  lesson('Refrigeration Cycle', 'A853', 'Career and Technical Education', 'HVAC Fundamentals', ['refrigerant', 'compressor', 'hvac']),
  lesson('Robot Welding Cell', 'A854', 'Career and Technical Education', 'Industrial Robotics Operations', ['robots', 'welding', 'automation']),
  lesson('Using Calipers', 'A855', 'Career and Technical Education', 'Precision Measurement', ['calipers', 'measurement', 'tools']),
  lesson('Pumps and Valves', 'A856', 'Career and Technical Education', 'Process Technology Core', ['pumps', 'valves', 'flow']),
  lesson('Distillation Columns', 'A857', 'Career and Technical Education', 'Process Technology Chemical and Refining', ['distillation', 'refining', 'chemistry']),
  lesson('MAG Welding Basics', 'A858', 'Career and Technical Education', 'Wave NG Welder', ['welding', 'mag', 'torch']),
  lesson('Poultry Anatomy', 'A859', 'Career and Technical Education', 'Mimbus Food', ['chicken', 'poultry', 'agriculture']),
  lesson('Heavy Truck Inspection', 'A860', 'Career and Technical Education', 'Heavy Machine & Vehicle Inspection', ['truck', 'inspection', 'safety']),
  lesson('Explore Health Careers', 'A861', 'Career and Technical Education', 'Career Explorer', ['careers', 'health', 'jobs']),
]
