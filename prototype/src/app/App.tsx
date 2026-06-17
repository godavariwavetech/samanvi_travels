import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Shield, Map, Shirt, FileSpreadsheet, 
  CreditCard, Wrench, Settings, Search, Plus, Filter, Download, 
  Printer, UserCircle, LogOut, Bell, ChevronRight, CheckCircle2, 
  AlertCircle, Trash2, Edit2, Eye, FileText, PlusCircle, MinusCircle, 
  Building2, Briefcase, TrendingUp, Car, PieChart, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility Functions ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// --- Shared UI Components ---
const GlassCard = ({ children, className, onClick }: { children: React.ReactNode; className?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-white/90 backdrop-blur-xl rounded-[24px] border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300", 
      onClick && "cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 hover:bg-white",
      className
    )}
  >
    {children}
  </div>
);

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'purple' }>(
  ({ children, variant = 'primary', className, ...props }, ref) => {
    const variants = {
      primary: "bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white hover:shadow-lg hover:shadow-blue-500/25 border border-blue-600/50",
      secondary: "bg-slate-100/80 text-slate-900 hover:bg-slate-200 border border-slate-200",
      outline: "border border-slate-200 bg-white/50 hover:bg-slate-50 text-slate-700",
      ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
      danger: "bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white hover:shadow-lg hover:shadow-red-500/25 border border-red-600/50",
      success: "bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white hover:shadow-lg hover:shadow-green-500/25 border border-green-600/50",
      purple: "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white hover:shadow-lg hover:shadow-purple-500/25 border border-purple-600/50"
    };
    return (
      <button 
        ref={ref}
        className={cn("inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]", variants[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:border-[#2563EB] focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:border-[#2563EB] focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm appearance-none",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

const Label = ({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block", className)} {...props}>
    {children}
  </label>
);

const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'teal' | 'slate' }) => {
  const variants = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    success: "bg-[#22C55E]/10 text-[#16a34a] border-[#22C55E]/20",
    warning: "bg-[#F59E0B]/10 text-[#d97706] border-[#F59E0B]/20",
    danger: "bg-[#EF4444]/10 text-[#dc2626] border-[#EF4444]/20",
    info: "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20",
    purple: "bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20",
    teal: "bg-[#14B8A6]/10 text-[#0D9488] border-[#14B8A6]/20",
    slate: "bg-slate-200/50 text-slate-700 border-slate-300/50",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors border", variants[variant], className)}>
      {children}
    </span>
  );
};

// --- Custom Hooks & Context ---
const useToast = () => {
  const [toasts, setToasts] = useState<{id: number, title: string, desc?: string, type: 'success'|'error'|'info'}[]>([]);
  const toast = (title: string, desc?: string, type: 'success'|'error'|'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, desc, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };
  const ToastContainer = () => (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 min-w-[320px] flex items-start gap-3 border border-slate-800">
            {t.type === 'success' ? <CheckCircle2 className="text-[#22C55E] w-5 h-5 shrink-0" /> : t.type === 'error' ? <AlertCircle className="text-[#EF4444] w-5 h-5 shrink-0" /> : <Bell className="text-[#2563EB] w-5 h-5 shrink-0" />}
            <div><h4 className="font-semibold text-sm">{t.title}</h4>{t.desc && <p className="text-slate-400 text-xs mt-1">{t.desc}</p>}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
  return { toast, ToastContainer };
};

// --- Mock Data ---
const CITIES = ["Rajahmundry", "Vijayawada", "Visakhapatnam", "Kakinada", "Guntur", "Tirupati"];
const BUSES = ["AP39TG4589", "AP05XY2231", "AP16AB7845", "AP37TR9921", "AP09BB4125"];
const STAFF = ["Pilli Venkata Ramana", "Golagani Sriram", "VD Perumalla Nageswara Reddy", "Jampana Prakash", "Durgam Balaji", "Challa Raju", "Kurva Shekar"];
const ROUTES = ["Rajahmundry → Vijayawada", "Vijayawada → Visakhapatnam", "Kakinada → Hyderabad", "Guntur → Chennai"];

// --- Layout Components ---
const TopNavTabs = ({ tabs, activeTab, onChange }: { tabs: string[], activeTab: string, onChange: (t: string) => void }) => (
  <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 shadow-sm w-fit mb-6">
    {tabs.map(tab => (
      <button key={tab} onClick={() => onChange(tab)} className={cn("px-5 py-2 rounded-xl text-sm font-bold transition-all", activeTab === tab ? "bg-white shadow-sm text-[#2563EB]" : "text-slate-500 hover:text-slate-900 hover:bg-white/50")}>
        {tab}
      </button>
    ))}
  </div>
);

const DataTable = ({ columns, data, title, onAction }: any) => {
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  return (
    <GlassCard className="flex flex-col flex-1 overflow-hidden mt-8">
      <div className="p-5 border-b border-slate-100 bg-white/40 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">{title || 'Recorded Data'}</h3>
          <p className="text-xs text-slate-500 font-medium">Viewing {data.length} records</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9 h-10 w-64 bg-white" placeholder="Search records..." />
          </div>
          <Button variant="outline" className="h-10 bg-white"><Filter className="w-4 h-4 mr-2"/> Filter</Button>
          <Button variant="outline" className="h-10 bg-white"><Download className="w-4 h-4 mr-2"/> Export</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              {columns.map((c: any, i: number) => <th key={i} className={`p-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${i===0?'pl-6':''}`}>{c.label}</th>)}
              <th className="p-4 text-right pr-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[240px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/30">
            {data.length === 0 ? (
              <tr><td colSpan={columns.length+1} className="p-8 text-center text-slate-500">No records found.</td></tr>
            ) : data.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                {columns.map((c: any, j: number) => (
                  <td key={j} className={`p-4 align-middle ${j===0?'pl-6 font-semibold text-slate-900':'text-slate-600 text-sm'}`}>
                    {c.render ? c.render(row[c.key], row) : row[c.key]}
                  </td>
                ))}
                <td className="p-4 align-middle text-right pr-6">
                  {/* Actions are now always visible */}
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => onAction('view', row)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors" title="View Details"><Eye className="w-4 h-4"/></button>
                    <button onClick={() => onAction('edit', row)} className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-lg transition-colors" title="Edit Record"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => onAction('pdf', row)} className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-lg transition-colors" title="Download PDF"><FileText className="w-4 h-4"/></button>
                    <button onClick={() => onAction('print', row)} className="p-1.5 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors" title="Print"><Printer className="w-4 h-4"/></button>
                    <button onClick={() => setConfirmDelete(row)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600"><AlertCircle className="w-6 h-6"/></div>
              <h3 className="text-xl font-bold text-slate-900">Delete Record?</h3>
              <p className="text-slate-500 text-sm mt-2 mb-6">Are you sure you want to delete this record? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <Button variant="danger" onClick={() => { onAction('delete', confirmDelete); setConfirmDelete(null); }}>Yes, Delete</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};

const DynamicRows = ({ columns, onAdd, onRemove, rows, renderRow }: any) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-bold text-slate-700">Line Items</h4>
      <Button variant="outline" size="sm" className="h-8 text-xs py-0" onClick={onAdd}><PlusCircle className="w-3.5 h-3.5 mr-1.5"/> Add Row</Button>
    </div>
    <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-1">
      <div className="flex gap-4 p-3 border-b border-slate-200/60 pb-2">
        {columns.map((c: string, i: number) => <div key={i} className="flex-1 text-xs font-bold text-slate-500 uppercase">{c}</div>)}
        <div className="w-8"></div>
      </div>
      {rows.map((r: any, i: number) => (
        <div key={i} className="flex gap-4 p-2 items-center">
          {renderRow(r, i)}
          <button onClick={() => onRemove(i)} className="w-8 text-slate-400 hover:text-red-500 p-2"><MinusCircle className="w-4 h-4"/></button>
        </div>
      ))}
    </div>
  </div>
);


// --- Main Application Component ---
export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif';
    document.body.style.background = 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 50%, #F5F3FF 100%)';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.minHeight = '100vh';
  }, []);

  const SIDEBAR_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
    { id: 'trips', label: 'Trip Management', icon: Map },
    { id: 'vendors', label: 'Vendor Management', icon: Building2 },
    { id: 'payroll', label: 'Payroll', icon: Briefcase },
    { id: 'accounting', label: 'Accounting & Finance', icon: CreditCard },
    { id: 'garage', label: 'Garage & Maintenance', icon: Wrench },
    { id: 'laundry', label: 'Laundry', icon: Shirt },
    { id: 'masters', label: 'Main Masters', icon: Settings },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleGlobalAction = (action: string, row: any) => {
    toast(`Action: ${action}`, `Applied to record successfully.`, action === 'delete' ? 'error' : 'success');
  };

  // --- Views ---
  const DashboardView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Executive Overview</h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time enterprise analytics for Samanvi Travels.</p>
        </div>
        <Button variant="primary" className="shadow-blue-500/25 shadow-lg"><Download className="w-4 h-4 mr-2"/> Download Report</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Trips', value: '142', change: '+12%', icon: Map, color: 'text-[#2563EB]', bg: 'bg-blue-100', trend: 'up' },
          { label: 'Monthly Revenue', value: '₹1.82 Cr', change: '+8.2%', icon: TrendingUp, color: 'text-[#22C55E]', bg: 'bg-green-100', trend: 'up' },
          { label: 'Fuel Expenses', value: '₹42.5 L', change: '-2.4%', icon: Activity, color: 'text-[#F59E0B]', bg: 'bg-amber-100', trend: 'down' },
          { label: 'Profit Margin', value: '24.8%', change: '+1.4%', icon: PieChart, color: 'text-[#7C3AED]', bg: 'bg-purple-100', trend: 'up' },
          { label: 'Pending Payroll', value: '₹12.4 L', change: '0%', icon: Briefcase, color: 'text-slate-600', bg: 'bg-slate-200', trend: 'flat' },
          { label: 'Garage Repairs', value: '18 Active', change: '+3', icon: Wrench, color: 'text-[#EF4444]', bg: 'bg-red-100', trend: 'up' },
          { label: 'Vendor Bills', value: '₹8.2 L', change: '-12%', icon: Building2, color: 'text-[#14B8A6]', bg: 'bg-teal-100', trend: 'down' },
          { label: 'Vehicle Utilization', value: '87%', change: '+4%', icon: Car, color: 'text-[#2563EB]', bg: 'bg-blue-100', trend: 'up' },
        ].map((kpi, i) => (
          <GlassCard key={i} className="p-6 flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-6">
              <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", kpi.bg)}>
                <kpi.icon className={cn("w-6 h-6", kpi.color)} />
              </div>
              <Badge variant={kpi.trend === 'up' ? 'success' : kpi.trend === 'down' ? 'warning' : 'default'}>{kpi.change}</Badge>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{kpi.label}</p>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</h3>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
           <div className="flex justify-between items-center mb-8">
             <h3 className="text-xl font-bold text-slate-900">Revenue & Expense Analytics</h3>
             <Select className="w-40 h-9 text-xs"><option>Last 6 Months</option></Select>
           </div>
           <div className="h-[350px] w-full">
             <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={350}>
                <AreaChart data={[
                  { name: 'May', rev: 1.2, exp: 0.8 }, { name: 'Jun', rev: 1.4, exp: 0.9 },
                  { name: 'Jul', rev: 1.3, exp: 0.85 }, { name: 'Aug', rev: 1.6, exp: 1.0 },
                  { name: 'Sep', rev: 1.7, exp: 1.1 }, { name: 'Oct', rev: 1.82, exp: 1.15 }
                ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs key="defs">
                    <linearGradient key="colorRev" id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient key="colorExp" id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis key="xaxis" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                  <YAxis key="yaxis" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickFormatter={(val) => `₹${val}Cr`} />
                  <RechartsTooltip key="tooltip" cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgb(0 0 0 / 0.15)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }} />
                  <Area key="area-rev" type="monotone" dataKey="rev" stroke="#2563EB" strokeWidth={4} fill="url(#colorRev)" name="Revenue" />
                  <Area key="area-exp" type="monotone" dataKey="exp" stroke="#7C3AED" strokeWidth={4} fill="url(#colorExp)" name="Expenses" />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </GlassCard>
        
        <GlassCard className="p-6">
           <h3 className="text-xl font-bold text-slate-900 mb-6">Recent Activities</h3>
           <div className="space-y-4">
             {[
               { t: 'Trip TRIP005821 Completed', d: '2 mins ago', s: 'success' },
               { t: 'Godavari Linen bill approved', d: '15 mins ago', s: 'info' },
               { t: 'AP39TG4589 repair logged', d: '1 hr ago', s: 'warning' },
               { t: 'Salary processed for Oct', d: '2 hrs ago', s: 'purple' },
               { t: 'New Vendor Added: AP Tyres', d: '5 hrs ago', s: 'slate' },
               { t: 'Fuel logged by Pilli Venkata', d: '6 hrs ago', s: 'teal' },
             ].map((a, i) => (
               <div key={i} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                 <div className="mt-1"><Badge variant={a.s as any}>•</Badge></div>
                 <div>
                   <p className="text-sm font-bold text-slate-800">{a.t}</p>
                   <p className="text-xs font-medium text-slate-500 mt-0.5">{a.d}</p>
                 </div>
               </div>
             ))}
           </div>
        </GlassCard>
      </div>
    </motion.div>
  );

  const UsersView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">User Management</h1>
      </div>
      
      <GlassCard className="p-6 relative overflow-visible">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-teal-400"></div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserCircle className="w-5 h-5 text-blue-500"/> Create New User</h2>
          <Button variant="primary" onClick={() => toast("User Created", "New user added to the system", "success")}>Save User</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div><Label>Full Name</Label><Input placeholder="e.g. Jampana Prakash" /></div>
          <div><Label>Mobile Number</Label><Input placeholder="+91" /></div>
          <div><Label>Email Address</Label><Input type="email" placeholder="user@samanvi.com" /></div>
          <div><Label>Role</Label><Select><option>Super Admin</option><option>Operations Manager</option><option>Accountant</option><option>Garage Supervisor</option></Select></div>
          <div><Label>Branch</Label><Select>{CITIES.map(c=><option key={c}>{c}</option>)}</Select></div>
          <div><Label>Status</Label><Select><option>Active</option><option>Inactive</option></Select></div>
        </div>
      </GlassCard>

      <DataTable 
        title="System Users" onAction={handleGlobalAction}
        columns={[
          { label: 'User Details', key: 'user', render: (v:string, r:any) => <div><div className="font-bold text-slate-800">{v}</div><div className="text-xs">{r.email}</div></div> },
          { label: 'Role', key: 'role', render: (v:string) => <Badge variant="purple">{v}</Badge> },
          { label: 'Branch', key: 'branch', render: (v:string) => <span className="font-medium text-slate-700">{v}</span> },
          { label: 'Status', key: 'status', render: (v:string) => <Badge variant={v==='Active'?'success':'slate'}>{v}</Badge> }
        ]}
        data={[
          { user: 'Jampana Prakash', email: 'prakash@samanvi.com', role: 'Super Admin', branch: 'Rajahmundry', status: 'Active' },
          { user: 'Durgam Balaji', email: 'balaji@samanvi.com', role: 'Accountant', branch: 'Vijayawada', status: 'Active' },
          { user: 'Pampana Venkata', email: 'venkata@samanvi.com', role: 'Garage Supervisor', branch: 'Visakhapatnam', status: 'Active' },
        ]}
      />
    </motion.div>
  );

  const RolesView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Roles & Permissions</h1>
      </div>
      
      <GlassCard className="p-6 relative overflow-visible">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shield className="w-5 h-5 text-purple-500"/> Define Role</h2>
          <Button variant="primary" onClick={() => toast("Role Saved", "Permissions updated successfully", "success")}>Save Role Config</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div><Label>Role Name</Label><Input placeholder="e.g. Fuel Supervisor" /></div>
          <div><Label>Description</Label><Input placeholder="Manages fuel logs and payments..." /></div>
        </div>
        <div>
          <Label>Permission Matrix</Label>
          <div className="flex flex-wrap gap-6 mt-3">
            {['View Records', 'Add New', 'Edit Existing', 'Delete Records', 'Approve Workflows', 'Export Data'].map((perm) => (
              <label key={perm} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded border-slate-300" />
                {perm}
              </label>
            ))}
          </div>
        </div>
      </GlassCard>

      <DataTable 
        title="Role Configurations" onAction={handleGlobalAction}
        columns={[
          { label: 'Role Name', key: 'role', render: (v:string, r:any) => <div><div className="font-bold text-slate-800">{v}</div><div className="text-xs text-slate-500">{r.desc}</div></div> },
          { label: 'Permissions', key: 'perms', render: (v:string) => <div className="text-xs font-medium text-slate-600 truncate max-w-sm">{v}</div> },
          { label: 'Assigned Users', key: 'users', render: (v:number) => <Badge variant="info">{v} Users</Badge> }
        ]}
        data={[
          { role: 'Super Admin', desc: 'Full system access', perms: 'All Permissions', users: 2 },
          { role: 'Operations Manager', desc: 'Manage trips and fleet', perms: 'View, Add, Edit, Approve, Export', users: 5 },
          { role: 'Accountant', desc: 'Manage vouchers and payroll', perms: 'View, Add, Edit, Export', users: 3 },
        ]}
      />
    </motion.div>
  );

  const TripManagementView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trip Management</h1>
      </div>
      
      <GlassCard className="p-6 relative overflow-visible">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Map className="w-5 h-5 text-blue-500"/> Create New Trip</h2>
          <Button variant="primary" onClick={() => toast("Trip Created", "TRIP005826 saved", "success")}>Save Trip Record</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div><Label>Trip Date</Label><Input type="date" defaultValue="2023-10-28" /></div>
          <div><Label>Bus Number</Label><Select><option value="">Select Bus</option>{BUSES.map(b=><option key={b}>{b}</option>)}</Select></div>
          <div><Label>Route</Label><Select><option value="">Select Route</option>{ROUTES.map(b=><option key={b}>{b}</option>)}</Select></div>
          <div><Label>Starting KM</Label><Input type="number" placeholder="e.g. 145000" /></div>
          
          <div><Label>Driver 1</Label><Select><option value="">Select Driver</option>{STAFF.map(b=><option key={b}>{b}</option>)}</Select></div>
          <div><Label>Driver 2</Label><Select><option value="">Select Driver</option>{STAFF.map(b=><option key={b}>{b}</option>)}</Select></div>
          <div><Label>Helper</Label><Select><option value="">Select Helper</option>{STAFF.map(b=><option key={b}>{b}</option>)}</Select></div>
          <div><Label>Closing KM (Optional)</Label><Input type="number" placeholder="Enter on close" /></div>
          
          <div className="md:col-span-4"><Label>Remarks</Label><Input placeholder="Special instructions for the trip..." /></div>
        </div>
      </GlassCard>

      <DataTable 
        title="Recent Trip Records"
        onAction={handleGlobalAction}
        columns={[
          { label: 'Trip ID', key: 'id' },
          { label: 'Date & Route', key: 'route', render: (v:string, r:any) => <div><div className="font-bold text-slate-800">{v}</div><div className="text-xs">{r.date}</div></div> },
          { label: 'Bus & Crew', key: 'bus', render: (v:string, r:any) => <div><div className="font-bold text-blue-600">{v}</div><div className="text-xs">{r.driver}</div></div> },
          { label: 'KMs Logged', key: 'kms', render: (v:string) => <Badge variant="info">{v}</Badge> },
          { label: 'Status', key: 'status', render: (v:string) => <Badge variant={v==='Completed'?'success':'warning'}>{v}</Badge> }
        ]}
        data={[
          { id: 'TRIP005821', date: '28 Oct 2023', route: 'Rajahmundry → Vijayawada', bus: 'AP39TG4589', driver: 'Pilli Venkata Ramana', kms: '450 km', status: 'Completed' },
          { id: 'TRIP005822', date: '28 Oct 2023', route: 'Vijayawada → Visakhapatnam', bus: 'AP16AB7845', driver: 'Golagani Sriram', kms: '380 km', status: 'Running' },
          { id: 'TRIP005823', date: '29 Oct 2023', route: 'Kakinada → Hyderabad', bus: 'AP05XY2231', driver: 'VD Perumalla', kms: '-', status: 'Scheduled' },
        ]}
      />
    </motion.div>
  );

  const VendorView = () => {
    const [tab, setTab] = useState('Add Vendor');
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Vendor Management</h1>
        </div>
        
        <TopNavTabs tabs={['Add Vendor', 'Add Bill', 'Approved Vouchers']} activeTab={tab} onChange={setTab} />

        {tab === 'Add Vendor' && (
          <>
            <GlassCard className="p-6 relative overflow-visible">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-teal-500"/> Vendor Registration</h2>
                <Button variant="primary" onClick={() => toast("Vendor Saved", "Godavari Linen Services registered", "success")}>Save Vendor Profile</Button>
              </div>
              
              <div className="space-y-8">
                <section>
                  <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wider">1. Vendor Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><Label>Vendor Name</Label><Input defaultValue="Godavari Linen Services" /></div>
                    <div><Label>GST Number</Label><Input defaultValue="37ABCDE1234F1ZP" /></div>
                    <div><Label>Mobile Number</Label><Input defaultValue="+91 9876543210" /></div>
                    <div className="md:col-span-2"><Label>Location / Address</Label><Input defaultValue="Rajahmundry, Andhra Pradesh" /></div>
                    <div><Label>Linked Ledger</Label><Select><option>Sundry Creditors - Vendors</option></Select></div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wider">2. Contract Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><Label>Contract Start</Label><Input type="date" /></div>
                    <div><Label>Contract End</Label><Input type="date" /></div>
                    <div><Label>Status</Label><Select><option>Active Contract</option><option>Expired</option></Select></div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wider">3. Product Pricing Matrix</h3>
                  <DynamicRows 
                    columns={['Product / Service Name', 'Rate (₹) per unit']}
                    rows={[{p: 'Blanket Wash', r: 12}, {p: 'Whites', r: 10}]}
                    onAdd={() => {}} onRemove={() => {}}
                    renderRow={(r:any) => (
                      <>
                        <Input className="flex-1" defaultValue={r.p} />
                        <Input className="flex-1" type="number" defaultValue={r.r} />
                      </>
                    )}
                  />
                </section>
              </div>
            </GlassCard>

            <DataTable 
              title="Registered Vendors" onAction={handleGlobalAction}
              columns={[
                { label: 'Vendor Details', key: 'vendor', render: (v:string, r:any) => <div><div className="font-bold text-slate-800">{v}</div><div className="text-xs">GST: {r.gst}</div></div> },
                { label: 'Location', key: 'loc' },
                { label: 'Contract Dates', key: 'dates', render: (v:string) => <span className="text-sm font-medium text-slate-600">{v}</span> },
                { label: 'Key Rates', key: 'rates', render: (v:string) => <div className="text-xs text-slate-500">{v}</div> },
                { label: 'Status', key: 'status', render: (v:string) => <Badge variant="success">{v}</Badge> }
              ]}
              data={[
                { vendor: 'Godavari Linen Services', gst: '37ABCDE1234F1ZP', loc: 'Rajahmundry, AP', dates: '01 Jan 23 - 31 Dec 23', rates: 'Blanket: ₹12 | Whites: ₹10', status: 'Active' },
                { vendor: 'Andhra Laundry Works', gst: '37XYXYZ9876Q1AB', loc: 'Vijayawada, AP', dates: '15 Feb 23 - 14 Feb 24', rates: 'Curtains: ₹15 | Bedsheets: ₹8', status: 'Active' }
              ]}
            />
          </>
        )}
      </motion.div>
    );
  };

  const PayrollView = () => {
    const [tab, setTab] = useState('Salary Payment');
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
         <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Payroll Management</h1>
        </div>
        <TopNavTabs tabs={['Salary Payment', 'Salary Generation', 'Payslip Reports', 'Payroll Analytics']} activeTab={tab} onChange={setTab} />

        {tab === 'Salary Payment' && (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
               <GlassCard className="p-6 relative overflow-visible border-red-100">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-rose-500"></div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><Briefcase className="w-5 h-5 text-red-500"/> Debit Account (Expense)</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Employee</Label><Select><option>VD Perumalla Nageswara Reddy</option></Select></div>
                      <div><Label>Role & Branch</Label><Input disabled value="Driver - Rajahmundry" className="bg-slate-100" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Basic Salary (₹)</Label><Input type="number" defaultValue="42000" /></div>
                      <div><Label>Incentive (₹)</Label><Input type="number" defaultValue="3500" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Advance Deduction (₹)</Label><Input type="number" defaultValue="5000" /></div>
                      <div><Label>Net Salary To Pay (₹)</Label><Input disabled value="40500" className="bg-emerald-50 text-emerald-900 font-bold text-lg" /></div>
                    </div>
                  </div>
               </GlassCard>

               <GlassCard className="p-6 relative overflow-visible border-blue-100 flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><CreditCard className="w-5 h-5 text-blue-500"/> Credit Account (Payment Source)</h2>
                    <div className="space-y-4">
                      <div><Label>Payment Mode</Label><Select><option>Bank Transfer (NEFT/RTGS)</option><option>Cash</option></Select></div>
                      <div><Label>Select Ledger</Label><Select><option>HDFC Bank Rajahmundry - A/c 8899</option><option>SBI Vijayawada - A/c 1122</option></Select></div>
                      <div><Label>Transaction Reference</Label><Input placeholder="UTR or Cheque Number" /></div>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                     <Button variant="primary" className="w-full text-lg h-12" onClick={() => toast("Payment Processed", "Salary voucher generated successfully", "success")}>Process Payment ₹40,500</Button>
                  </div>
               </GlassCard>
            </div>

            <DataTable 
              title="Recent Salary Disbursals" onAction={handleGlobalAction}
              columns={[
                { label: 'Employee', key: 'emp', render: (v:string, r:any) => <div><div className="font-bold text-slate-800">{v}</div><div className="text-xs">{r.role}</div></div> },
                { label: 'Earnings', key: 'earn', render: (v:string) => <span className="font-medium text-slate-700">{v}</span> },
                { label: 'Deductions', key: 'ded', render: (v:string) => <span className="text-red-500 font-medium">-{v}</span> },
                { label: 'Net Paid', key: 'net', render: (v:string) => <span className="font-bold text-emerald-600 text-lg">{v}</span> },
                { label: 'Status', key: 'status', render: (v:string) => <Badge variant="success">{v}</Badge> }
              ]}
              data={[
                { emp: 'VD Perumalla Nageswara Reddy', role: 'Driver - RJY', earn: '₹45,500', ded: '₹5,000', net: '₹40,500', status: 'Paid' },
                { emp: 'Challa Raju', role: 'Conductor - VJA', earn: '₹33,000', ded: '₹0', net: '₹33,000', status: 'Paid' },
                { emp: 'Golagani Sriram', role: 'Technician - VSKP', earn: '₹36,500', ded: '₹2,000', net: '₹34,500', status: 'Paid' }
              ]}
            />
          </>
        )}
      </motion.div>
    );
  };

  const AccountingView = () => {
    const [tab, setTab] = useState('Voucher Entry');
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Accounting & Finance</h1>
        </div>
        <TopNavTabs tabs={['Voucher Entry', 'Approved Vouchers', 'Day Book', 'Trial Balance', 'Profit & Loss']} activeTab={tab} onChange={setTab} />

        {tab === 'Voucher Entry' && (
          <>
            <GlassCard className="p-6 relative overflow-visible">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-500"/> Journal / Payment Voucher</h2>
                <Button variant="purple" onClick={() => toast("Voucher Posted", "Voucher VCH002519 saved", "success")}>Post Voucher</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 border-b border-slate-200 pb-8">
                 <div><Label>Voucher Type</Label><Select><option>Payment Voucher</option><option>Receipt</option><option>Journal</option></Select></div>
                 <div><Label>Date</Label><Input type="date" defaultValue="2023-10-28" /></div>
                 <div><Label>Vehicle Ref (Opt)</Label><Select><option value="">None</option>{BUSES.map(b=><option key={b}>{b}</option>)}</Select></div>
                 <div><Label>Staff Ref (Opt)</Label><Select><option value="">None</option>{STAFF.map(b=><option key={b}>{b}</option>)}</Select></div>
                 <div className="md:col-span-4"><Label>Narration / Description</Label><Input placeholder="Being amount paid for..." /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Debit Section */}
                 <div className="space-y-4">
                    <h3 className="font-bold text-red-600 flex items-center justify-between">
                      <span>DEBIT (Dr)</span>
                      <span className="text-xl">₹ 43,100</span>
                    </h3>
                    <DynamicRows 
                      columns={['Ledger Account', 'Amount']}
                      rows={[{l: 'Fuel Expenses', a: 43100}]}
                      onAdd={() => {}} onRemove={() => {}}
                      renderRow={(r:any) => (
                        <>
                          <Select className="flex-1"><option>{r.l}</option></Select>
                          <Input className="w-32 text-right" type="number" defaultValue={r.a} />
                        </>
                      )}
                    />
                 </div>
                 {/* Credit Section */}
                 <div className="space-y-4">
                    <h3 className="font-bold text-emerald-600 flex items-center justify-between">
                      <span>CREDIT (Cr)</span>
                      <span className="text-xl">₹ 43,100</span>
                    </h3>
                    <DynamicRows 
                      columns={['Ledger Account', 'Amount']}
                      rows={[{l: 'HDFC Bank Rajahmundry', a: 43100}]}
                      onAdd={() => {}} onRemove={() => {}}
                      renderRow={(r:any) => (
                        <>
                          <Select className="flex-1"><option>{r.l}</option></Select>
                          <Input className="w-32 text-right" type="number" defaultValue={r.a} />
                        </>
                      )}
                    />
                 </div>
              </div>
            </GlassCard>

            <DataTable 
              title="Recent Vouchers" onAction={handleGlobalAction}
              columns={[
                { label: 'Voucher No', key: 'no', render: (v:string, r:any) => <div><div className="font-bold text-slate-800">{v}</div><div className="text-xs">{r.date}</div></div> },
                { label: 'Type', key: 'type', render: (v:string) => <Badge variant="purple">{v}</Badge> },
                { label: 'Ledgers', key: 'ledgers', render: (v:any, r:any) => <div className="text-xs leading-relaxed"><div className="text-red-600 font-bold">Dr. {r.dr}</div><div className="text-emerald-600 font-bold">Cr. {r.cr}</div></div> },
                { label: 'Amount', key: 'amt', render: (v:string) => <span className="font-extrabold text-slate-900 text-base">{v}</span> },
                { label: 'Status', key: 'status', render: (v:string) => <Badge variant="success">{v}</Badge> }
              ]}
              data={[
                { no: 'VCH002516', date: '28 Oct 23', type: 'Payment', dr: 'Fuel Expenses', cr: 'SBI Rajahmundry', amt: '₹43,100', status: 'Approved' },
                { no: 'VCH002517', date: '28 Oct 23', type: 'Payment', dr: 'Vehicle Maintenance', cr: 'Cash', amt: '₹18,500', status: 'Approved' },
                { no: 'VCH002518', date: '27 Oct 23', type: 'Journal', dr: 'Toll Expenses', cr: 'Petty Cash', amt: '₹4,500', status: 'Approved' }
              ]}
            />
          </>
        )}
      </motion.div>
    );
  };

  const GarageView = () => {
    const [tab, setTab] = useState('Repair Entry');
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
         <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Garage & Maintenance</h1>
        </div>
        <TopNavTabs tabs={['Repair Entry', 'Repair Tracking', 'Vehicle History', 'Reports']} activeTab={tab} onChange={setTab} />

        {tab === 'Repair Entry' && (
          <>
            <GlassCard className="p-6 relative overflow-visible">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Wrench className="w-5 h-5 text-amber-500"/> Log Vehicle Repair</h2>
                <Button variant="primary" onClick={() => toast("Repair Logged", "Job card JOB-012 created", "success")}>Generate Job Card</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                 <div><Label>Vehicle Number</Label><Select><option>AP39TG4589</option></Select></div>
                 <div><Label>Current Odometer</Label><Input type="number" defaultValue="215400" /></div>
                 <div><Label>Category</Label><Select><option>Engine</option><option>Electrical</option><option>Body Work</option></Select></div>
                 <div><Label>Priority</Label><Select><option>High</option><option>Medium</option><option>Low</option></Select></div>
                 <div><Label>Reported By (Driver)</Label><Select><option>Pilli Venkata Ramana</option></Select></div>
                 <div><Label>Assigned Technician</Label><Select><option>Pampana Venkata Siva Rajesh</option></Select></div>
                 <div className="md:col-span-2"><Label>Issue Description</Label><Input placeholder="Engine making knocking sound..." /></div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wider">Spare Parts Consumed</h3>
                <DynamicRows 
                  columns={['Part Name', 'Quantity', 'Rate', 'Total']}
                  rows={[{p: 'Engine Oil (L)', q: 15, r: 450, t: 6750}, {p: 'Oil Filter', q: 1, r: 850, t: 850}]}
                  onAdd={() => {}} onRemove={() => {}}
                  renderRow={(r:any) => (
                    <>
                      <Select className="flex-[2]"><option>{r.p}</option></Select>
                      <Input className="flex-1 text-center" type="number" defaultValue={r.q} />
                      <Input className="flex-1 text-right" type="number" defaultValue={r.r} />
                      <Input className="flex-1 text-right font-bold bg-slate-100" disabled defaultValue={r.t} />
                    </>
                  )}
                />
              </div>
            </GlassCard>

            <DataTable 
              title="Active Job Cards" onAction={handleGlobalAction}
              columns={[
                { label: 'Job Card', key: 'job', render: (v:string, r:any) => <div><div className="font-bold text-slate-800">{v}</div><div className="text-xs text-blue-600">{r.veh}</div></div> },
                { label: 'Details', key: 'cat', render: (v:string, r:any) => <div className="text-xs leading-relaxed"><div className="font-bold text-slate-700">{v}</div><div>Odo: {r.odo}</div></div> },
                { label: 'Personnel', key: 'tech', render: (v:string, r:any) => <div className="text-xs leading-relaxed"><div><span className="text-slate-400">Tech:</span> {v}</div><div><span className="text-slate-400">Drv:</span> {r.drv}</div></div> },
                { label: 'Priority', key: 'pri', render: (v:string) => <Badge variant={v==='High'?'danger':'warning'}>{v}</Badge> },
                { label: 'Amount', key: 'amt', render: (v:string) => <span className="font-bold text-slate-900">{v}</span> },
                { label: 'Status', key: 'status', render: (v:string) => <span className="font-medium text-slate-600 text-sm">{v}</span> }
              ]}
              data={[
                { job: 'JOB-009', veh: 'AP39TG4589', cat: 'Engine Repair', odo: '215,400', tech: 'Pampana Venkata', drv: 'Pilli Venkata', pri: 'High', amt: '₹22,000', status: 'In Progress' },
                { job: 'JOB-010', veh: 'AP05XY2231', cat: 'Electrical', odo: '188,200', tech: 'Golagani Sriram', drv: 'Kurva Shekar', pri: 'Medium', amt: '₹8,500', status: 'Waiting Parts' }
              ]}
            />
          </>
        )}
      </motion.div>
    );
  };

  const LaundryView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Laundry Logs</h1>
      </div>
      
      <GlassCard className="p-6 relative overflow-visible">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-cyan-500"></div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shirt className="w-5 h-5 text-teal-500"/> Log Laundry Dispatch/Receipt</h2>
          <Button variant="primary" onClick={() => toast("Laundry Logged", "Log entry saved successfully", "success")}>Save Log</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div><Label>Log Date</Label><Input type="date" defaultValue="2023-10-28" /></div>
          <div><Label>Vendor</Label><Select><option>Godavari Linen Services</option></Select></div>
          <div><Label>Product / Item</Label><Select><option>Blanket Wash</option><option>Whites</option></Select></div>
          <div><Label>Quantity Delivered</Label><Input type="number" defaultValue="50" /></div>
          <div><Label>Quantity Received</Label><Input type="number" defaultValue="0" /></div>
        </div>
      </GlassCard>

      <DataTable 
        title="Recent Laundry Transactions" onAction={handleGlobalAction}
        columns={[
          { label: 'Date', key: 'date', render: (v:string) => <span className="font-bold text-slate-800">{v}</span> },
          { label: 'Vendor', key: 'vendor' },
          { label: 'Item', key: 'item', render: (v:string) => <Badge variant="info">{v}</Badge> },
          { label: 'Delivered', key: 'del', render: (v:number) => <span className="text-amber-600 font-bold">{v}</span> },
          { label: 'Received', key: 'rec', render: (v:number) => <span className="text-emerald-600 font-bold">{v}</span> },
          { label: 'Status', key: 'status', render: (v:string) => <Badge variant={v==='Pending'?'warning':'success'}>{v}</Badge> }
        ]}
        data={[
          { date: '28 Oct 23', vendor: 'Godavari Linen Services', item: 'Blanket Wash', del: 50, rec: 0, status: 'Pending' },
          { date: '26 Oct 23', vendor: 'Andhra Laundry Works', item: 'Whites', del: 120, rec: 120, status: 'Completed' },
        ]}
      />
    </motion.div>
  );

  const MastersView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Main Masters</h1>
      </div>
      
      <GlassCard className="p-6 relative overflow-visible">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-600 to-slate-900"></div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-600"/> Create System Master</h2>
          <Button variant="primary" onClick={() => toast("Master Created", "System dictionary updated", "success")}>Save Master</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div><Label>Master Type</Label><Select><option>Service Type</option><option>Bus Type</option><option>Fuel Type</option><option>City</option></Select></div>
          <div><Label>Master Name</Label><Input placeholder="e.g. Sleeper AC" /></div>
          <div><Label>Description</Label><Input placeholder="Optional description..." /></div>
          <div><Label>Status</Label><Select><option>Active</option><option>Inactive</option></Select></div>
        </div>
      </GlassCard>

      <DataTable 
        title="Configured Masters" onAction={handleGlobalAction}
        columns={[
          { label: 'Type', key: 'type', render: (v:string) => <Badge variant="slate">{v}</Badge> },
          { label: 'Name', key: 'name', render: (v:string) => <span className="font-bold text-slate-800">{v}</span> },
          { label: 'Description', key: 'desc' },
          { label: 'Status', key: 'status', render: (v:string) => <Badge variant="success">{v}</Badge> }
        ]}
        data={[
          { type: 'Service Type', name: 'Full Party', desc: 'Private booking trips', status: 'Active' },
          { type: 'Bus Type', name: 'Sleeper AC', desc: 'Premium sleeper configuration', status: 'Active' },
          { type: 'Fuel Type', name: 'Diesel', desc: 'Standard fuel type', status: 'Active' },
        ]}
      />
    </motion.div>
  );

  const ReportsView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics & Reports</h1>
      </div>
      
      <GlassCard className="p-6 relative overflow-visible">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400"></div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-500"/> Report Generator</h2>
          <Button variant="primary" onClick={() => toast("Report Generated", "Downloading PDF...", "success")}>Generate & Download</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div><Label>Report Category</Label><Select><option>Trip Analytics</option><option>Expense Report</option><option>Fuel Consumption</option><option>Payroll Summary</option></Select></div>
          <div><Label>Date From</Label><Input type="date" /></div>
          <div><Label>Date To</Label><Input type="date" /></div>
          <div><Label>Export Format</Label><Select><option>PDF Document</option><option>Excel Spreadsheet</option></Select></div>
        </div>
      </GlassCard>

      <DataTable 
        title="Recently Generated Reports" onAction={handleGlobalAction}
        columns={[
          { label: 'Report Name', key: 'name', render: (v:string) => <span className="font-bold text-slate-800">{v}</span> },
          { label: 'Date Range', key: 'range' },
          { label: 'Generated By', key: 'user' },
          { label: 'Format', key: 'format', render: (v:string) => <Badge variant={v==='PDF'?'danger':'success'}>{v}</Badge> }
        ]}
        data={[
          { name: 'Monthly Trip Analytics', range: '01 Oct 23 - 31 Oct 23', user: 'Jampana Prakash', format: 'PDF' },
          { name: 'Fuel Consumption Summary', range: '01 Oct 23 - 31 Oct 23', user: 'Pilli Venkata', format: 'Excel' },
        ]}
      />
    </motion.div>
  );

  const SettingsView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
      </div>
      
      <GlassCard className="p-6 relative overflow-visible">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-600"></div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-600"/> Company Configuration</h2>
          <Button variant="primary" onClick={() => toast("Settings Saved", "System configuration updated", "success")}>Save Configuration</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><Label>Company Name</Label><Input defaultValue="Samanvi Travels" /></div>
          <div><Label>Headquarters Location</Label><Input defaultValue="Andhra Pradesh" /></div>
          <div><Label>GST Number</Label><Input defaultValue="37XYZAB1234C1Z9" /></div>
          <div><Label>Financial Year</Label><Select><option>2023-2024</option></Select></div>
        </div>
      </GlassCard>

      <DataTable 
        title="Audit Logs" onAction={handleGlobalAction}
        columns={[
          { label: 'Action', key: 'action', render: (v:string) => <span className="font-bold text-slate-800">{v}</span> },
          { label: 'Timestamp', key: 'time' },
          { label: 'User', key: 'user' },
          { label: 'IP Address', key: 'ip', render: (v:string) => <span className="text-xs font-mono text-slate-500">{v}</span> }
        ]}
        data={[
          { action: 'Updated GST Number', time: '28 Oct 23, 10:45 AM', user: 'Super Admin', ip: '192.168.1.104' },
          { action: 'Changed Financial Year', time: '01 Apr 23, 09:00 AM', user: 'Super Admin', ip: '192.168.1.104' },
        ]}
      />
    </motion.div>
  );

  const getActiveView = () => {
    switch (activeMenu) {
      case 'dashboard': return <DashboardView />;
      case 'trips': return <TripManagementView />;
      case 'vendors': return <VendorView />;
      case 'payroll': return <PayrollView />;
      case 'accounting': return <AccountingView />;
      case 'garage': return <GarageView />;
      case 'users': return <UsersView />;
      case 'roles': return <RolesView />;
      case 'laundry': return <LaundryView />;
      case 'masters': return <MastersView />;
      case 'reports': return <ReportsView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -300 }} animate={{ x: 0 }} 
        className="w-[280px] bg-[#0F172A] text-white flex flex-col z-20 flex-shrink-0 shadow-2xl relative"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
        <div className="h-24 flex items-center px-8 gap-4 border-b border-slate-800/80 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
            <span className="font-black text-2xl tracking-tighter text-white">S</span>
          </div>
          <div>
            <h2 className="font-extrabold text-xl tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">Samanvi</h2>
            <p className="text-[11px] text-blue-400 font-bold uppercase tracking-[0.2em] mt-0.5">Enterprise ERP</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-8 px-4 space-y-1.5 scrollbar-hide relative z-10">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={cn(
                  "w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold group relative overflow-hidden",
                  isActive ? "text-white bg-white/10 shadow-inner border border-white/5" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                )}
              >
                {isActive && <motion.div layoutId="activeNav" className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#2563EB] to-[#7C3AED] rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />}
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-[#14B8A6]" : "text-slate-500 group-hover:text-slate-300")} />
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="p-6 border-t border-slate-800/80 relative z-10">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors cursor-pointer backdrop-blur-md">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center font-bold text-sm text-white shadow-inner">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-white">Super Admin</p>
              <p className="text-xs text-slate-400 truncate font-medium">Head Office</p>
            </div>
            <LogOut className="w-4 h-4 text-slate-500 hover:text-white" />
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header */}
        <header className="h-20 bg-white/40 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-10 z-20 sticky top-0 shadow-[0_4px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-500 uppercase tracking-wider">
             <span className="text-[#2563EB]">Samanvi Hub</span>
             <ChevronRight className="w-4 h-4 text-slate-300" />
             <span className="text-slate-900">{activeMenu.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search anything (Ctrl+K)..." 
                className="w-72 h-11 pl-11 pr-4 rounded-full bg-white/60 border border-slate-200/60 text-sm focus:ring-2 focus:ring-[#2563EB]/50 outline-none transition-all focus:bg-white focus:shadow-md font-medium placeholder:text-slate-400"
              />
            </div>
            <button className="relative p-2.5 text-slate-400 hover:text-slate-700 bg-white/60 border border-slate-200/60 rounded-full hover:bg-white transition-all shadow-sm">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-white shadow-sm"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="max-w-[1600px] mx-auto h-full"
            >
              {getActiveView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}