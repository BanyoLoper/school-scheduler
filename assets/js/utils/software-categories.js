export const KNOWN_SOFTWARE = [
  { name: 'Unreal Engine', version: '5.3',   category: 'development', license_type: 'free' },
  { name: 'Unreal Engine', version: '4.27',  category: 'development', license_type: 'free' },
  { name: 'Unity',         version: '2023',  category: 'development', license_type: 'edu' },
  { name: 'Blender',       version: '4.0',   category: 'design',      license_type: 'free' },
  { name: 'Adobe Photoshop',version: '2024', category: 'design',      license_type: 'commercial' },
  { name: 'Adobe Illustrator',version:'2024',category: 'design',      license_type: 'commercial' },
  { name: 'Visual Studio', version: '2022',  category: 'development', license_type: 'free' },
  { name: 'VS Code',        version: '1.85', category: 'development', license_type: 'free' },
  { name: 'Cisco Packet Tracer',version:'8.2',category:'networking',  license_type: 'edu' },
  { name: 'Wireshark',     version: '4.2',   category: 'networking',  license_type: 'free' },
  { name: 'GNS3',          version: '2.2',   category: 'networking',  license_type: 'free' },
  // Cybersecurity labs intentionally have no software (clean machines)
];

export const CATEGORY_DESCRIPTIONS = {
  design:        'Herramientas de diseño gráfico, 3D y multimedia',
  development:   'Motores de juego, IDEs y frameworks de desarrollo',
  cybersecurity: 'Máquinas limpias para pentesting y CTF (sin software previo)',
  networking:    'Simuladores y analizadores de redes',
  none:          'Software general / sin categoría específica',
};
