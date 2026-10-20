import type { Model } from './types'

// Studio models (single 3D models). All placeholders.
// TO ADD ONE: copy a line and change it. model(name, code, subject, keywords)
function model(name: string, code: string, subject: string, keywords: string[]): Model {
  return { type: 'model', id: `model-${code}`, name, code, subject, keywords }
}

export const models: Model[] = [
  // ---------- Life Science ----------
  model('Human Heart', 'M101', 'Life Science', ['heart', 'organ', 'circulation', 'anatomy']),
  model('Human Brain', 'M102', 'Life Science', ['brain', 'organ', 'nervous system', 'anatomy']),
  model('Human Skull', 'M103', 'Life Science', ['skull', 'bones', 'skeleton', 'anatomy']),
  model('Human Skeleton', 'M104', 'Life Science', ['bones', 'skeleton', 'anatomy']),
  model('Human Lungs', 'M105', 'Life Science', ['lungs', 'breathing', 'anatomy']),
  model('Human Eye', 'M106', 'Life Science', ['eye', 'vision', 'anatomy']),
  model('Human Ear', 'M107', 'Life Science', ['ear', 'hearing', 'anatomy']),
  model('Human Tooth', 'M108', 'Life Science', ['tooth', 'teeth', 'enamel']),
  model('Animal Cell', 'M110', 'Life Science', ['cell', 'nucleus', 'organelles']),
  model('Plant Cell', 'M111', 'Life Science', ['cell', 'chloroplast', 'organelles']),
  model('DNA Double Helix', 'M112', 'Life Science', ['dna', 'genetics', 'helix']),
  model('Bacteria', 'M113', 'Life Science', ['microorganism', 'microbe', 'cell']),
  model('Virus', 'M114', 'Life Science', ['microorganism', 'virus', 'capsid']),
  model('Frog', 'M115', 'Life Science', ['amphibian', 'animal', 'dissection']),
  model('Monarch Butterfly', 'M116', 'Life Science', ['insect', 'butterfly', 'metamorphosis']),
  model('Honeybee', 'M117', 'Life Science', ['insect', 'bee', 'pollination']),
  model('Ladybug', 'M118', 'Life Science', ['insect', 'beetle', 'bugs']),
  model('Sunflower', 'M119', 'Life Science', ['flower', 'plant', 'pollination']),
  model('Oak Tree', 'M120', 'Life Science', ['tree', 'plant', 'forest']),
  model('Great White Shark', 'M121', 'Life Science', ['shark', 'fish', 'ocean']),
  model('Sea Turtle', 'M122', 'Life Science', ['turtle', 'reptile', 'ocean']),
  model('Bald Eagle', 'M123', 'Life Science', ['bird', 'eagle', 'predator']),
  model('African Elephant', 'M124', 'Life Science', ['elephant', 'mammal', 'savanna']),
  model('Horse Skeleton', 'M125', 'Life Science', ['horse', 'bones', 'mammal']),

  // ---------- Earth and Space Science ----------
  model('Earth Layers', 'M130', 'Earth and Space Science', ['crust', 'mantle', 'core', 'geology']),
  model('Volcano Cross Section', 'M131', 'Earth and Space Science', ['volcano', 'magma', 'lava']),
  model('Solar System', 'M132', 'Earth and Space Science', ['planets', 'sun', 'space']),
  model('Earth', 'M133', 'Earth and Space Science', ['planet', 'globe', 'space']),
  model('Moon', 'M134', 'Earth and Space Science', ['moon', 'lunar', 'craters']),
  model('Mars', 'M135', 'Earth and Space Science', ['planet', 'red planet', 'space']),
  model('Saturn', 'M136', 'Earth and Space Science', ['planet', 'rings', 'space']),
  model('Mars Rover', 'M137', 'Earth and Space Science', ['rover', 'robot', 'space exploration']),
  model('International Space Station', 'M138', 'Earth and Space Science', ['iss', 'satellite', 'astronauts']),
  model('Quartz Crystal', 'M139', 'Earth and Space Science', ['mineral', 'crystal', 'rocks']),
  model('Stalactite Cave', 'M140', 'Earth and Space Science', ['cave', 'limestone', 'stalactites']),
  model('Tyrannosaurus Rex Skeleton', 'M141', 'Earth and Space Science', ['dinosaur', 't-rex', 'fossil']),
  model('Triceratops', 'M142', 'Earth and Space Science', ['dinosaur', 'fossil', 'herbivore']),
  model('Ammonite Fossil', 'M143', 'Earth and Space Science', ['fossil', 'shell', 'ancient']),
  model('Hurricane', 'M144', 'Earth and Space Science', ['weather', 'storm', 'wind']),

  // ---------- Physical Science ----------
  model('Water Molecule', 'M150', 'Physical Science', ['h2o', 'molecule', 'chemistry']),
  model('Carbon Atom', 'M151', 'Physical Science', ['atom', 'carbon', 'chemistry']),
  model('Sodium Chloride Crystal', 'M152', 'Physical Science', ['salt', 'crystal', 'lattice', 'chemistry']),
  model('Methane Molecule', 'M153', 'Physical Science', ['molecule', 'gas', 'chemistry']),
  model('Glucose Molecule', 'M154', 'Physical Science', ['sugar', 'molecule', 'chemistry']),
  model('Chemistry Lab Glassware', 'M155', 'Physical Science', ['beaker', 'flask', 'chemistry', 'lab']),
  model('Electric Motor', 'M156', 'Physical Science', ['motor', 'magnet', 'electricity']),
  model('Battery Cell', 'M157', 'Physical Science', ['battery', 'electricity', 'chemistry']),
  model('Light Bulb', 'M158', 'Physical Science', ['bulb', 'filament', 'electricity']),
  model('Prism', 'M159', 'Physical Science', ['light', 'rainbow', 'optics']),
  model('Newton’s Cradle', 'M160', 'Physical Science', ['momentum', 'pendulum', 'energy']),
  model('Pulley System', 'M161', 'Physical Science', ['pulley', 'simple machine', 'work']),

  // ---------- Engineering & CTE ----------
  model('V8 Engine', 'M170', 'Career and Technical Education', ['engine', 'pistons', 'automotive']),
  model('Jet Engine', 'M171', 'Engineering', ['turbine', 'aircraft', 'engine']),
  model('Gear Train', 'M172', 'Engineering', ['gears', 'mechanical', 'torque']),
  model('Wind Turbine', 'M173', 'Engineering', ['wind', 'energy', 'turbine']),
  model('Solar Panel', 'M174', 'Engineering', ['solar', 'energy', 'photovoltaic']),
  model('Suspension Bridge', 'M175', 'Engineering', ['bridge', 'cables', 'structures']),
  model('Industrial Robot Arm', 'M176', 'Career and Technical Education', ['robot', 'arm', 'automation']),
  model('Air Conditioner Unit', 'M177', 'Career and Technical Education', ['hvac', 'compressor', 'cooling']),
  model('Hydraulic Excavator', 'M178', 'Career and Technical Education', ['excavator', 'hydraulics', 'heavy equipment']),
  model('Disc Brake', 'M179', 'Career and Technical Education', ['brakes', 'automotive', 'rotor']),

  // ---------- Social Science, Arts & Math ----------
  model('Great Pyramid of Giza', 'M180', 'Social Science', ['pyramid', 'egypt', 'history']),
  model('Roman Colosseum', 'M181', 'Social Science', ['colosseum', 'rome', 'history']),
  model('Parthenon', 'M182', 'Social Science', ['greece', 'temple', 'history']),
  model('Viking Longship', 'M183', 'Social Science', ['ship', 'vikings', 'history']),
  model('Steam Locomotive', 'M184', 'Social Science', ['train', 'steam engine', 'industrial revolution']),
  model('Medieval Castle', 'M185', 'Social Science', ['castle', 'medieval', 'history']),
  model('Statue of David', 'M190', 'Arts', ['sculpture', 'michelangelo', 'statue']),
  model('Platonic Solids', 'M195', 'Mathematics', ['cube', 'tetrahedron', 'geometry']),
  model('Cone and Cylinder', 'M196', 'Mathematics', ['cone', 'cylinder', 'volume', 'geometry']),
]
