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
    'hero.title': 'XMRT Economy',
    'hero.subtitle': 'Mobile Mining Democracy • AI-Human Collaboration • Privacy as a Fundamental Right',
    'hero.tag.smartphone': '📱 Smartphone Mining',
    'hero.tag.ai': '🤖 Autonomous AI',
    'hero.tag.privacy': '🔐 Privacy First',
    'hero.tag.mesh': '🕸️ Mesh Networks',
    
    // Mining Section
    'mining.title': 'Mobile Mining Democracy in Action',
    'mining.subtitle': 'Every smartphone becomes a tool of economic empowerment • Live data from the mesh network',
    
    // AI Section
    'ai.title': 'Eliza AI: Autonomous DAO Operator',
    'ai.subtitle': 'The philosophical AI guide embodying XMRT principles • Voice-enabled for mobile-first experience • 95%+ autonomous decision-making capabilities',
    
    // Actions Section
    'actions.title': 'Join the Infrastructure Revolution',
    'actions.subtitle': 'Transform your smartphone into a mining node • Participate in true decentralized governance • Build the mesh network',
    'actions.start.mining': 'Start Mobile Mining',
    'actions.join.dao': 'Join DAO Governance',
    
    // Calculator
    'calculator.title': 'Smartphone Mining Calculator',
    'calculator.subtitle': 'Calculate your mobile mining potential • ARM processor optimization • Thermal management included',
    
    // Feature Cards
    'feature.mobile.title': 'Mobile Mining Democracy',
    'feature.mobile.description': 'Transform smartphones into tools of economic empowerment',
    'feature.mobile.tag.arm': '📱 ARM Optimized',
    'feature.mobile.tag.battery': '🔋 Battery Safe',
    'feature.mobile.tag.thermal': '🌡️ Thermal Managed',
    
    'feature.dao.title': 'Autonomous DAO Governance',
    'feature.dao.description': '95%+ autonomous AI with verifiable compute and community oversight',
    'feature.dao.executives': 'AI Executives',
    'feature.dao.compute': 'Verifiable Compute',
    'feature.dao.status.active': 'Active',
    'feature.dao.status.certified': 'Certified',
    
    'feature.privacy.title': 'Privacy-First Infrastructure',
    'feature.privacy.description': 'Mesh networks, private transactions, and censorship-resistant communication',
    'feature.privacy.mesh': 'Mesh Network',
    'feature.privacy.privacy': 'Privacy',
    'feature.privacy.status.building': 'Building',
    'feature.privacy.status.fundamental': 'Fundamental',
    
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
  },
  es: {
    // Hero Section
    'hero.title': 'Economía XMRT',
    'hero.subtitle': 'Democracia de Minería Móvil • Colaboración IA-Humano • Privacidad como Derecho Fundamental',
    'hero.tag.smartphone': '📱 Minería Móvil',
    'hero.tag.ai': '🤖 IA Autónoma',
    'hero.tag.privacy': '🔐 Privacidad Primero',
    'hero.tag.mesh': '🕸️ Redes Mesh',
    
    // Mining Section
    'mining.title': 'Democracia de Minería Móvil en Acción',
    'mining.subtitle': 'Cada smartphone se convierte en una herramienta de empoderamiento económico • Datos en vivo de la red mesh',
    
    // AI Section
    'ai.title': 'Eliza IA: Operador DAO Autónomo',
    'ai.subtitle': 'La guía filosófica de IA que encarna los principios XMRT • Habilitada por voz para experiencia móvil • Capacidades de toma de decisiones 95%+ autónomas',
    
    // Actions Section
    'actions.title': 'Únete a la Revolución de Infraestructura',
    'actions.subtitle': 'Transforma tu smartphone en un nodo de minería • Participa en gobernanza verdaderamente descentralizada • Construye la red mesh',
    'actions.start.mining': 'Iniciar Minería Móvil',
    'actions.join.dao': 'Unirse a Gobernanza DAO',
    
    // Calculator
    'calculator.title': 'Calculadora de Minería Móvil',
    'calculator.subtitle': 'Calcula tu potencial de minería móvil • Optimización de procesador ARM • Gestión térmica incluida',
    
    // Feature Cards
    'feature.mobile.title': 'Democracia de Minería Móvil',
    'feature.mobile.description': 'Transforma smartphones en herramientas de empoderamiento económico',
    'feature.mobile.tag.arm': '📱 Optimizado ARM',
    'feature.mobile.tag.battery': '🔋 Seguro para Batería',
    'feature.mobile.tag.thermal': '🌡️ Gestionado Térmicamente',
    
    'feature.dao.title': 'Gobernanza DAO Autónoma',
    'feature.dao.description': 'IA 95%+ autónoma con cómputo verificable y supervisión comunitaria',
    'feature.dao.executives': 'Ejecutivos IA',
    'feature.dao.compute': 'Cómputo Verificable',
    'feature.dao.status.active': 'Activo',
    'feature.dao.status.certified': 'Certificado',
    
    'feature.privacy.title': 'Infraestructura Privacidad-Primero',
    'feature.privacy.description': 'Redes mesh, transacciones privadas y comunicación resistente a la censura',
    'feature.privacy.mesh': 'Red Mesh',
    'feature.privacy.privacy': 'Privacidad',
    'feature.privacy.status.building': 'Construyendo',
    'feature.privacy.status.fundamental': 'Fundamental',
    
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