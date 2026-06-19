import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bell, Menu, LogOut, User, ChevronDown, Bot, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { request, unwrapData } from '@/services/authService';
import { platformV1 } from '@/services/platformV1Service';
import { useToast } from '@/components/ui/use-toast';
import WasteToValueLogo from '@/components/brand/WasteToValueLogo';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [liveUnreadCount, setLiveUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      if (!currentUser) { setLiveNotifications([]); setLiveUnreadCount(0); return; }
      try {
        const response = await platformV1.notifications.list();
        const list = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        if (!cancelled) {
          setLiveNotifications(list);
          setLiveUnreadCount(response?.unread_count ?? list.filter((n) => !n.read_at).length);
        }
      } catch {
        if (!cancelled) {
          setLiveNotifications([]);
          setLiveUnreadCount(0);
        }
      }
    }
    loadNotifications();
    const onRefresh = () => loadNotifications();
    window.addEventListener('wtv-data-mutated', onRefresh);
    return () => { cancelled = true; window.removeEventListener('wtv-data-mutated', onRefresh); };
  }, [currentUser?.id]);

  const isPublic = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup';
  const unreadCount = currentUser ? liveUnreadCount : 0;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const roleLinks = {
    supplier: { label: 'Supplier Portal', path: '/supplier' },
    admin: { label: 'Super Admin Dashboard', path: '/admin' },
    industry: { label: 'Factory Portal', path: '/industry' },
    driver: { label: 'Driver Portal', path: '/driver' },
    hub_manager: { label: 'Hub Dashboard', path: '/hub-manager' },
  };

  const publicNav = [
    { label: 'Platform', href: '#platform' },
    { label: 'Materials', href: '#materials' },
    { label: 'Process', href: '#process' },
    { label: 'ESG', href: '#esg' },
  ];

  const askAi = async () => {
    if (!aiPrompt.trim()) return;
    const prompt = aiPrompt;
    setAiPrompt('');
    setAiLoading(true);
    try {
      const response = await request('/api/v1/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: prompt }),
      });
      const data = unwrapData(response);
      setAiReply(data?.answer || response?.message || 'AI answered successfully.');
    } catch {
      setAiReply('AI assistant is not connected right now. Please check GEMINI_API_KEY/API server, then try again.');
      toast({ title: 'AI unavailable', description: 'No fake local answer was used. Connect Gemini or start the API server.', variant: 'destructive', duration: 4000 });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/80 bg-background/90 shadow-[0_6px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <WasteToValueLogo />
          </Link>

          {isPublic && (
            <div className="hidden lg:flex items-center gap-7">
              {publicNav.map(item => (
                item.href.startsWith('/')
                  ? <Link key={item.label} to={item.href} className={`text-sm font-semibold transition-colors ${location.pathname === item.href ? 'text-primary' : 'text-secondary-text hover:text-main'}`}>{item.label}</Link>
                  : <a key={item.label} href={item.href} className="text-sm font-semibold text-secondary-text hover:text-main transition-colors">{item.label}</a>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {currentUser ? (
              <>
                <Link to={roleLinks[currentUser.role]?.path || '/'}>
                  <Button variant="ghost" size="sm" className="hidden lg:inline-flex text-sm font-semibold">
                    {roleLinks[currentUser.role]?.label}
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="w-4.5 h-4.5" />
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-gradient-wine border-0">
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="p-3 border-b">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={async () => { try { await platformV1.notifications.markAllRead(); setLiveUnreadCount(0); setLiveNotifications((items) => items.map((n) => ({ ...n, read_at: new Date().toISOString() }))); } catch { toast({ title: 'Notifications unavailable', description: 'Could not mark notifications as read because the API is not reachable.', variant: 'destructive' }); } }} className="text-xs text-primary hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {liveNotifications.slice(0, 8).map(n => (
                        <DropdownMenuItem key={n.id} className={`p-3 ${!n.read_at ? 'bg-primary/5' : ''}`} onClick={async () => { try { await platformV1.notifications.markRead(n.id); setLiveNotifications((items) => items.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)); setLiveUnreadCount((c) => Math.max(c - 1, 0)); } catch { toast({ title: 'Notifications unavailable', description: 'Could not mark this notification as read because the API is not reachable.', variant: 'destructive' }); } }}>
                          <div>
                            <p className="text-xs leading-relaxed font-medium">{n.data?.title || n.type || 'Platform update'}</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">{n.data?.message || n.message || 'New notification'}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at || n.createdAt || Date.now()).toLocaleDateString()}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      {liveNotifications.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* <Button variant="ghost" size="icon" onClick={() => setShowAi(true)} className="hidden sm:inline-flex rounded-xl">
                  <Bot className="w-4.5 h-4.5" />
                </Button> */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-wine flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{currentUser.name?.[0]}</span>
                      </div>
                      <span className="hidden md:inline text-sm">{currentUser.name?.split(' ')[0]}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="px-3 py-2 border-b">
                      <p className="text-sm font-medium">{currentUser.name}</p>
                      <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                      <Badge variant="secondary" className="mt-1 text-[10px] capitalize">{currentUser.role}</Badge>
                    </div>
                    <DropdownMenuItem onClick={() => navigate(roleLinks[currentUser.role]?.path || '/')}>
                      <User className="w-4 h-4 mr-2" /> Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" size="sm" className="hidden sm:inline-flex text-sm font-semibold">Sign In</Button></Link>
                <Link to="/register"><Button size="sm" className="hidden sm:inline-flex bg-gradient-wine hover:brightness-105 text-white text-sm font-semibold">Get Started</Button></Link>
              </>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[86vw] max-w-sm border-border/80 bg-card">
                <div className="mt-8 flex flex-col gap-4">
                  {isPublic && publicNav.map(item => (
                    item.href.startsWith('/')
                      ? <Link key={item.label} to={item.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-base font-semibold text-main hover:bg-muted">{item.label}</Link>
                      : <a key={item.label} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-base font-semibold text-main hover:bg-muted">{item.label}</a>
                  ))}
                  {!currentUser && (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-base font-semibold text-main hover:bg-muted">Sign In</Link>
                    <Link to="/register" onClick={() => setOpen(false)}><Button className="w-full bg-gradient-wine text-white font-semibold">Get Started</Button></Link>
                  </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <Dialog open={showAi} onOpenChange={setShowAi}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Waste-to-Value AI Assistant</DialogTitle></DialogHeader>
          <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={4} placeholder="Ask about pickups, invoices, onboarding, dispatch, QA..." className="rounded-xl" />
          <Button className="w-full rounded-xl bg-gradient-primary text-white" onClick={askAi}>{aiLoading ? 'Thinking...' : 'Send'}</Button>
          {aiReply && <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">{aiReply}</div>}
        </DialogContent>
      </Dialog>
    </nav>
  );
}
