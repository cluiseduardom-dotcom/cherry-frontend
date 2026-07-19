/* =====================================================
   MOCK DATA — Cherry Semijoias ERP
   ===================================================== */

export const categories = ['Todos', 'Anéis', 'Brincos', 'Colares', 'Pulseiras', 'Tornozeleiras'];

export const products = [
  {
    id: 1,
    sku: 'AN-001',
    name: 'Anel Solitário Cristal',
    category: 'Anéis',
    price: 89.90,
    stock: 12,
    image: null,
    color: '#C9A96E',
  },
  {
    id: 2,
    sku: 'BR-024',
    name: 'Brinco Argola Dourada',
    category: 'Brincos',
    price: 59.90,
    stock: 3,
    image: null,
    color: '#D4AF37',
  },
  {
    id: 3,
    sku: 'CO-017',
    name: 'Colar Pérola Clássico',
    category: 'Colares',
    price: 129.90,
    stock: 8,
    image: null,
    color: '#F5F0E8',
  },
  {
    id: 4,
    sku: 'PU-033',
    name: 'Pulseira Elos Prata',
    category: 'Pulseiras',
    price: 74.90,
    stock: 2,
    image: null,
    color: '#C0C0C0',
  },
  {
    id: 5,
    sku: 'AN-015',
    name: 'Anel Coração Zircônia',
    category: 'Anéis',
    price: 99.90,
    stock: 15,
    image: null,
    color: '#A70636',
  },
  {
    id: 6,
    sku: 'BR-041',
    name: 'Brinco Flor Esmaltado',
    category: 'Brincos',
    price: 49.90,
    stock: 0,
    image: null,
    color: '#E8A0BF',
  },
  {
    id: 7,
    sku: 'CO-029',
    name: 'Colar Borboleta Ouro',
    category: 'Colares',
    price: 149.90,
    stock: 6,
    image: null,
    color: '#FFD700',
  },
  {
    id: 8,
    sku: 'PU-018',
    name: 'Pulseira Charm Rosé',
    category: 'Pulseiras',
    price: 84.90,
    stock: 9,
    image: null,
    color: '#F4A7B9',
  },
  {
    id: 9,
    sku: 'AN-022',
    name: 'Anel Banda Pavê',
    category: 'Anéis',
    price: 119.90,
    stock: 4,
    image: null,
    color: '#B8860B',
  },
];

export const customers = [
  { id: 1, name: 'Ana Paula Costa', email: 'ana@email.com', phone: '(11) 99999-0001', purchases: 14, totalSpent: 1289.60 },
  { id: 2, name: 'Beatriz Lima',    email: 'bia@email.com', phone: '(21) 99999-0002', purchases: 7,  totalSpent: 634.30 },
  { id: 3, name: 'Carla Mendes',    email: 'carla@email.com',phone: '(31) 99999-0003',purchases: 21, totalSpent: 2540.10 },
  { id: 4, name: 'Daniela Rocha',   email: 'dani@email.com', phone: '(41) 99999-0004', purchases: 3,  totalSpent: 299.70 },
  { id: 5, name: 'Eduarda Ferraz',  email: 'edu@email.com',  phone: '(51) 99999-0005', purchases: 11, totalSpent: 987.40 },
];

export const salesHistory = [
  { id: 'V-001', date: '2026-07-15', customer: 'Ana Paula Costa', items: 3, total: 239.70, status: 'concluída' },
  { id: 'V-002', date: '2026-07-15', customer: 'Beatriz Lima',    items: 1, total: 89.90,  status: 'concluída' },
  { id: 'V-003', date: '2026-07-14', customer: 'Carla Mendes',    items: 5, total: 489.50, status: 'concluída' },
  { id: 'V-004', date: '2026-07-14', customer: 'Daniela Rocha',   items: 2, total: 159.80, status: 'cancelada' },
  { id: 'V-005', date: '2026-07-13', customer: 'Eduarda Ferraz',  items: 4, total: 339.60, status: 'concluída' },
  { id: 'V-006', date: '2026-07-13', customer: 'Ana Paula Costa', items: 2, total: 189.80, status: 'concluída' },
  { id: 'V-007', date: '2026-07-12', customer: 'Beatriz Lima',    items: 3, total: 269.70, status: 'concluída' },
];

export const dashboardStats = {
  salesToday:    { value: 'R$ 1.847,50', change: '+12.4%', positive: true },
  itemsSold:     { value: '47',          change: '+8.2%',  positive: true },
  avgTicket:     { value: 'R$ 93,20',    change: '-2.1%',  positive: false },
  lowStock:      { value: '3 itens',     change: '+1',     positive: false },
};

export const sparklineData = {
  salesToday: [30, 45, 38, 60, 55, 78, 92, 85, 100, 88, 95, 110],
  itemsSold:  [5, 8, 6, 12, 10, 15, 18, 14, 20, 16, 19, 22],
  avgTicket:  [85, 90, 88, 95, 92, 89, 93, 91, 88, 94, 90, 93],
  lowStock:   [1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3],
};
