import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Hero Section
    'hero.title': 'XMRT Assistant',
    'hero.subtitle': 'AI-Powered Personal Assistant • Voice-Enabled Productivity • Mining Intelligence Integration',
    'hero.tag.smartphone': '📱 Voice Interface',
    'hero.tag.ai': '🤖 Smart Assistant',
    'hero.tag.privacy': '🔐 Privacy First',
    'hero.tag.mesh': '⚡ Real-time Insights',
    
    // Mining Section
    'mining.title': 'Live Mining Intelligence',
    'mining.subtitle': 'Real-time mining data integrated into your AI assistant • Performance insights at your fingertips',
    
    // AI Section
    'ai.title': 'Meet Your AI Assistant',
    'ai.subtitle': 'Intelligent personal assistant with mining insights • Voice-enabled for hands-free interaction • Task automation and productivity tools',
    
    // Actions Section
    'actions.title': 'Start Your AI Experience',
    'actions.subtitle': 'Chat with your assistant • Get mining insights • Boost your productivity',
    'actions.start.mining': 'Start Conversation',
    'actions.join.dao': 'Explore Features',
    
    // Calculator
    'calculator.title': 'Productivity Calculator',
    'calculator.subtitle': 'Calculate efficiency gains with your AI assistant • Task automation • Time optimization',
    
    // Feature Cards
    'feature.mobile.title': 'Voice-Enabled Interface',
    'feature.mobile.description': 'Natural conversation with your AI assistant anywhere',
    'feature.mobile.tag.arm': '🎤 Voice Commands',
    'feature.mobile.tag.battery': '⚡ Instant Response',
    'feature.mobile.tag.thermal': '🧠 Smart Learning',
    
    'feature.dao.title': 'Mining Intelligence',
    'feature.dao.description': 'Real-time mining insights and performance analytics',
    'feature.dao.executives': 'Live Stats',
    'feature.dao.compute': 'Smart Analysis',
    'feature.dao.status.active': 'Active',
    'feature.dao.status.certified': 'Verified',
    
    'feature.privacy.title': 'Productivity Tools',
    'feature.privacy.description': 'Task automation, reminders, and intelligent assistance',
    'feature.privacy.mesh': 'Task Manager',
    'feature.privacy.privacy': 'Smart Tools',
    'feature.privacy.status.building': 'Growing',
    'feature.privacy.status.fundamental': 'Essential',
    
    // Navigation
    'nav.home': 'Home',
    'nav.treasury': 'Treasury',
    
    // Treasury Page
    'treasury.title': 'XMRT Treasury',
    'treasury.description': 'Purchase crypto and view treasury statistics',
    'treasury.purchase.title': 'Purchase Crypto',
    'treasury.stats.title': 'Treasury Statistics',
    'treasury.stats.tvl': 'Total Value Locked',
    'treasury.stats.contributors': 'Contributors',
    
    // Mining Calculator
    'calculator.info.title': 'MobileMonero Information',
    'calculator.info.description': 'MobileMonero.com is the first mobile-first Monero mining platform designed for smartphones and tablets.',
    'calculator.info.empowering': 'Empowering users to participate in cryptocurrency mining using ARM processors.',
    'calculator.mining.title': 'MobileMonero Mining Calculator',
    'calculator.hashrate.label': 'Device Hashrate',
    'calculator.devices.label': 'Number of Mining Devices',
    'calculator.price.label': 'Monero Price (USD)',
    'calculator.network.title': 'Network Statistics',
    'calculator.network.hashrate': 'Total Network Hashrate',
    'calculator.network.share': 'Your Network Share',
    'calculator.network.price': 'XMR Price',
    'calculator.earnings.title': 'Projected Earnings',
    'calculator.earnings.daily': 'Daily',
    'calculator.earnings.monthly': 'Monthly',
    'calculator.earnings.yearly': 'Yearly',
    'calculator.disclaimer': 'These calculations are estimates based on current network difficulty and may vary significantly. Actual mining results depend on device performance, network conditions, and market factors.',
    
    // Mining Stats
    'stats.title': 'Live Mining Statistics',
    'stats.hashrate': 'Current Hashrate',
    'stats.shares': 'Valid Shares',
    'stats.invalid.shares': 'Invalid Shares',
    'stats.amount.due': 'Amount Due',
    'stats.amount.paid': 'Amount Paid',
    'stats.transactions': 'Transactions',
    'stats.last.hash': 'Last Hash',
    'stats.total.hashes': 'Total Hashes',
    'stats.status.online': 'Online',
    'stats.status.offline': 'Offline',
    'stats.last.update': 'Last Update',
    'stats.retry': 'Retry Connection',
    'stats.demo.mode': 'Demo Mode',
    'stats.ago': 'ago',
    
    // Chat Interface
    'chat.error.microphone': 'Unable to access microphone',
    'chat.error.connection': 'Connection error',
    'chat.error.network': 'Network error',
    'chat.status.connecting': 'Connecting...',
    'chat.status.connected': 'Connected',
    'chat.status.disconnected': 'Disconnected',
    'chat.status.listening': 'Listening...',
    'chat.status.speaking': 'Speaking...',
    'chat.button.start': 'Start Conversation',
    'chat.button.stop': 'Stop',
    'chat.button.retry': 'Retry',
    'chat.permissions.needed': 'Microphone permission needed',
    
    // DAO Tabs
    'dao.tabs.members': 'Members',
    'dao.tabs.xmrt': 'XMRT',
    'dao.tabs.governance': 'Governance',
    'dao.tabs.treasury': 'Treasury',
    'dao.tabs.proposals': 'Proposals',
    'dao.tabs.discussions': 'Discussions',
    
    // XMRT Faucet
    'faucet.title': 'XMRT Token Faucet',
    'faucet.description': 'Claim free XMRT tokens on Sepolia testnet',
    'faucet.network.status': 'Network Status',
    'faucet.network.correct': 'Connected to Sepolia',
    'faucet.network.wrong': 'Switch to Sepolia Testnet',
    'faucet.claim.amount': 'Claim Amount',
    'faucet.claim.status': 'Claim Status',
    'faucet.claim.available': 'Available to claim',
    'faucet.claim.cooldown': 'Cooldown active',
    'faucet.claim.button': 'Claim XMRT',
    'faucet.claim.next': 'Next claim available in',
    'faucet.success': 'Successfully claimed XMRT tokens!',
    'faucet.error': 'Failed to claim tokens. Please try again.',
    'faucet.error.network': 'Please connect to Sepolia testnet first.',
    
    // Mobile Monero Calculator Info Sections
    'calculator.info.how.works': 'How It Works',
    'calculator.info.how.works.point1': 'Advanced mobile processors mine Monero optimally',
    'calculator.info.how.works.point2': 'SSB (Solid State Battery) enables sustained 3-5+ KH/s',
    'calculator.info.how.works.point3': 'Mining rewards fund XMRT DAO operations',
    'calculator.info.how.works.point4': 'Decentralized network of high-performance mobile miners',
    'calculator.info.how.works.point5': 'ARM optimization for maximum efficiency',
    
    'calculator.info.dao.benefits': 'DAO Benefits',
    'calculator.info.dao.benefits.point1': 'Self-sustaining treasury through mining revenue',
    'calculator.info.dao.benefits.point2': 'Democratic governance powered by mining participants',
    'calculator.info.dao.benefits.point3': 'Environmental efficiency through mobile devices',
    'calculator.info.dao.benefits.point4': 'Global accessibility without specialized hardware',
    
    // Workflow Steps
    'workflow.title': 'Asset Creation Steps',
    'workflow.description': 'Follow these steps to create your {type} asset',
    'workflow.start': 'Start Creating',
    'workflow.image.step1': 'Create a base ERC-721 or ERC-1155 contract for optimal gas efficiency',
    'workflow.image.step2': 'Upload your image file (PNG, JPG, GIF)',
    'workflow.image.step3': 'Set image properties (dimensions, resolution)',
    'workflow.image.step4': 'Add metadata (title, description, attributes)',
    'workflow.image.step5': 'Preview your NFT',
    'workflow.code.step1': 'Deploy a factory contract for efficient contract deployment',
    'workflow.code.step2': 'Upload or paste your smart contract code',
    'workflow.code.step3': 'Configure contract parameters',
    'workflow.code.step4': 'Test contract functionality',
    'workflow.code.step5': 'Deploy and verify contract',
    'workflow.document.step1': 'Initialize an ERC-721 contract with document management features',
    'workflow.document.step2': 'Upload your document (PDF, DOC)',
    'workflow.document.step3': 'Set access permissions',
    'workflow.document.step4': 'Add version control settings',
    'workflow.document.step5': 'Configure sharing options',
    'workflow.audio.step1': 'Set up an ERC-721 contract optimized for audio NFTs',
    'workflow.audio.step2': 'Upload your audio file (MP3, WAV)',
    'workflow.audio.step3': 'Set audio properties (bitrate, duration)',
    'workflow.audio.step4': 'Add track information',
    'workflow.audio.step5': 'Configure playback settings',
  },
  es: {
    // Hero Section
    'hero.title': 'Asistente XMRT',
    'hero.subtitle': 'Asistente Personal con IA • Interfaz de Voz Habilitada • Integración de Inteligencia Minera',
    'hero.tag.smartphone': '📱 Interfaz de Voz',
    'hero.tag.ai': '🤖 Asistente Inteligente',
    'hero.tag.privacy': '🔐 Privacidad Primero',
    'hero.tag.mesh': '⚡ Información en Tiempo Real',
    
    // Mining Section
    'mining.title': 'Inteligencia Minera en Vivo',
    'mining.subtitle': 'Datos de minería en tiempo real integrados en tu asistente IA • Información de rendimiento al alcance',
    
    // AI Section
    'ai.title': 'Conoce a tu Asistente IA',
    'ai.subtitle': 'Asistente personal inteligente con información minera • Habilitado por voz para interacción sin manos • Herramientas de automatización y productividad',
    
    // Actions Section
    'actions.title': 'Comienza tu Experiencia IA',
    'actions.subtitle': 'Chatea con tu asistente • Obtén información minera • Aumenta tu productividad',
    'actions.start.mining': 'Iniciar Conversación',
    'actions.join.dao': 'Explorar Funciones',
    
    // Calculator
    'calculator.title': 'Calculadora de Productividad',
    'calculator.subtitle': 'Calcula ganancias de eficiencia con tu asistente IA • Automatización de tareas • Optimización de tiempo',
    
    // Feature Cards
    'feature.mobile.title': 'Interfaz Habilitada por Voz',
    'feature.mobile.description': 'Conversación natural con tu asistente IA en cualquier lugar',
    'feature.mobile.tag.arm': '🎤 Comandos de Voz',
    'feature.mobile.tag.battery': '⚡ Respuesta Instantánea',
    'feature.mobile.tag.thermal': '🧠 Aprendizaje Inteligente',
    
    'feature.dao.title': 'Inteligencia Minera',
    'feature.dao.description': 'Información minera en tiempo real y análisis de rendimiento',
    'feature.dao.executives': 'Estadísticas en Vivo',
    'feature.dao.compute': 'Análisis Inteligente',
    'feature.dao.status.active': 'Activo',
    'feature.dao.status.certified': 'Verificado',
    
    'feature.privacy.title': 'Herramientas de Productividad',
    'feature.privacy.description': 'Automatización de tareas, recordatorios y asistencia inteligente',
    'feature.privacy.mesh': 'Gestor de Tareas',
    'feature.privacy.privacy': 'Herramientas Inteligentes',
    'feature.privacy.status.building': 'Creciendo',
    'feature.privacy.status.fundamental': 'Esencial',
    
    // Navigation
    'nav.home': 'Inicio',
    'nav.treasury': 'Tesorería',
    
    // Treasury Page
    'treasury.title': 'Tesorería XMRT',
    'treasury.description': 'Compra cripto y ve estadísticas de la tesorería',
    'treasury.purchase.title': 'Comprar Cripto',
    'treasury.stats.title': 'Estadísticas de Tesorería',
    'treasury.stats.tvl': 'Valor Total Bloqueado',
    'treasury.stats.contributors': 'Contribuyentes',
    
    // Mining Calculator
    'calculator.info.title': 'Información MobileMonero',
    'calculator.info.description': 'MobileMonero.com es la primera plataforma de minería Monero móvil diseñada para smartphones y tablets.',
    'calculator.info.empowering': 'Empodera a los usuarios a participar en minería de criptomonedas usando procesadores ARM.',
    'calculator.mining.title': 'Calculadora de Minería MobileMonero',
    'calculator.hashrate.label': 'Hashrate del Dispositivo',
    'calculator.devices.label': 'Número de Dispositivos de Minería',
    'calculator.price.label': 'Precio de Monero (USD)',
    'calculator.network.title': 'Estadísticas de Red',
    'calculator.network.hashrate': 'Hashrate Total de Red',
    'calculator.network.share': 'Tu Participación en Red',
    'calculator.network.price': 'Precio XMR',
    'calculator.earnings.title': 'Ganancias Proyectadas',
    'calculator.earnings.daily': 'Diario',
    'calculator.earnings.monthly': 'Mensual',
    'calculator.earnings.yearly': 'Anual',
    'calculator.disclaimer': 'Estos cálculos son estimaciones basadas en la dificultad actual de la red y pueden variar significativamente. Los resultados reales de minería dependen del rendimiento del dispositivo, condiciones de red y factores de mercado.',
    
    // Mining Stats
    'stats.title': 'Estadísticas de Minería en Vivo',
    'stats.hashrate': 'Hashrate Actual',
    'stats.shares': 'Shares Válidos',
    'stats.invalid.shares': 'Shares Inválidos',
    'stats.amount.due': 'Cantidad Adeudada',
    'stats.amount.paid': 'Cantidad Pagada',
    'stats.transactions': 'Transacciones',
    'stats.last.hash': 'Último Hash',
    'stats.total.hashes': 'Hashes Totales',
    'stats.status.online': 'En Línea',
    'stats.status.offline': 'Desconectado',
    'stats.last.update': 'Última Actualización',
    'stats.retry': 'Reintentar Conexión',
    'stats.demo.mode': 'Modo Demo',
    'stats.ago': 'hace',
    
    // Chat Interface
    'chat.error.microphone': 'No se puede acceder al micrófono',
    'chat.error.connection': 'Error de conexión',
    'chat.error.network': 'Error de red',
    'chat.status.connecting': 'Conectando...',
    'chat.status.connected': 'Conectado',
    'chat.status.disconnected': 'Desconectado',
    'chat.status.listening': 'Escuchando...',
    'chat.status.speaking': 'Hablando...',
    'chat.button.start': 'Iniciar Conversación',
    'chat.button.stop': 'Detener',
    'chat.button.retry': 'Reintentar',
    'chat.permissions.needed': 'Se necesita permiso del micrófono',
    
    // DAO Tabs
    'dao.tabs.members': 'Miembros',
    'dao.tabs.xmrt': 'XMRT',
    'dao.tabs.governance': 'Gobernanza',
    'dao.tabs.treasury': 'Tesorería',
    'dao.tabs.proposals': 'Propuestas',
    'dao.tabs.discussions': 'Discusiones',
    
    // XMRT Faucet
    'faucet.title': 'Faucet de Tokens XMRT',
    'faucet.description': 'Reclama tokens XMRT gratuitos en la testnet Sepolia',
    'faucet.network.status': 'Estado de Red',
    'faucet.network.correct': 'Conectado a Sepolia',
    'faucet.network.wrong': 'Cambiar a Testnet Sepolia',
    'faucet.claim.amount': 'Cantidad a Reclamar',
    'faucet.claim.status': 'Estado de Reclamo',
    'faucet.claim.available': 'Disponible para reclamar',
    'faucet.claim.cooldown': 'Tiempo de espera activo',
    'faucet.claim.button': 'Reclamar XMRT',
    'faucet.claim.next': 'Próximo reclamo disponible en',
    'faucet.success': '¡Tokens XMRT reclamados exitosamente!',
    'faucet.error': 'Error al reclamar tokens. Intenta de nuevo.',
    'faucet.error.network': 'Por favor conecta primero a la testnet Sepolia.',
    
    // Mobile Monero Calculator Info Sections
    'calculator.info.how.works': 'Cómo Funciona',
    'calculator.info.how.works.point1': 'Procesadores móviles avanzados minan Monero de manera óptima',
    'calculator.info.how.works.point2': 'SSB (Batería de Estado Sólido) permite sostener 3-5+ KH/s',
    'calculator.info.how.works.point3': 'Recompensas de minería financian operaciones del DAO XMRT',
    'calculator.info.how.works.point4': 'Red descentralizada de mineros móviles de alto rendimiento',
    'calculator.info.how.works.point5': 'Optimización ARM para máxima eficiencia',
    
    'calculator.info.dao.benefits': 'Beneficios del DAO',
    'calculator.info.dao.benefits.point1': 'Tesorería auto-sostenible a través de ingresos de minería',
    'calculator.info.dao.benefits.point2': 'Gobernanza democrática impulsada por participantes de minería',
    'calculator.info.dao.benefits.point3': 'Eficiencia ambiental a través de dispositivos móviles',
    'calculator.info.dao.benefits.point4': 'Accesibilidad global sin hardware especializado',
    
    // Workflow Steps
    'workflow.title': 'Pasos de Creación de Activos',
    'workflow.description': 'Sigue estos pasos para crear tu activo {type}',
    'workflow.start': 'Comenzar a Crear',
    'workflow.image.step1': 'Crear un contrato base ERC-721 o ERC-1155 para eficiencia óptima de gas',
    'workflow.image.step2': 'Sube tu archivo de imagen (PNG, JPG, GIF)',
    'workflow.image.step3': 'Establece propiedades de imagen (dimensiones, resolución)',
    'workflow.image.step4': 'Agrega metadatos (título, descripción, atributos)',
    'workflow.image.step5': 'Previsualiza tu NFT',
    'workflow.code.step1': 'Despliega un contrato factory para despliegue eficiente de contratos',
    'workflow.code.step2': 'Sube o pega tu código de contrato inteligente',
    'workflow.code.step3': 'Configura parámetros del contrato',
    'workflow.code.step4': 'Prueba funcionalidad del contrato',
    'workflow.code.step5': 'Despliega y verifica contrato',
    'workflow.document.step1': 'Inicializa un contrato ERC-721 con características de gestión de documentos',
    'workflow.document.step2': 'Sube tu documento (PDF, DOC)',
    'workflow.document.step3': 'Establece permisos de acceso',
    'workflow.document.step4': 'Agrega configuraciones de control de versión',
    'workflow.document.step5': 'Configura opciones de compartir',
    'workflow.audio.step1': 'Configura un contrato ERC-721 optimizado para NFTs de audio',
    'workflow.audio.step2': 'Sube tu archivo de audio (MP3, WAV)',
    'workflow.audio.step3': 'Establece propiedades de audio (bitrate, duración)',
    'workflow.audio.step4': 'Agrega información de pista',
    'workflow.audio.step5': 'Configura ajustes de reproducción',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};