import React, { useState } from 'react';
import { useCams, CamData } from '@/hooks/useCams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Video, Plus, Pencil, Trash2, CheckCircle2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function CamsManager() {
  const { cams, isLoading, addCam, updateCam, deleteCam } = useCams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCam, setEditingCam] = useState<CamData | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [status, setStatus] = useState('LIVE');
  const [external, setExternal] = useState(false);
  const [source, setSource] = useState('');
  const [region, setRegion] = useState('');

  const resetForm = () => {
    setName('');
    setLocation('');
    setUrl('');
    setThumbnail('');
    setStatus('LIVE');
    setExternal(false);
    setSource('');
    setRegion('');
    setEditingCam(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (cam: CamData) => {
    setEditingCam(cam);
    setName(cam.name);
    setLocation(cam.location);
    setUrl(cam.url);
    setThumbnail(cam.thumbnail);
    setStatus(cam.status);
    setExternal(cam.external || false);
    setSource(cam.source || '');
    setRegion(cam.region || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const camData = {
      name,
      location,
      url,
      thumbnail,
      status,
      external,
      source,
      region
    };

    if (editingCam && editingCam.$id) {
      await updateCam.mutateAsync({ id: editingCam.$id, data: camData });
    } else {
      await addCam.mutateAsync(camData);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק מצלמה זו?')) {
      await deleteCam.mutateAsync(id);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Video className="w-5 h-5 text-blue-500" />
            ניהול מצלמות חוף
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            הוסף, ערוך או מחק מצלמות המופיעות בעמוד "מצלמות חוף בלייב".
          </p>
        </div>
        <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2 ml-1" />
          הוסף מצלמה
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : cams.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-lg">
            אין מצלמות כרגע. לחץ על "הוסף מצלמה" כדי להתחיל.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cams.map((cam) => (
              <Card key={cam.$id} className="overflow-hidden">
                <div className="aspect-video relative bg-slate-200 dark:bg-slate-800">
                  <img src={cam.thumbnail} alt={cam.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${cam.status === 'LIVE' ? 'bg-red-500 text-white' : 'bg-slate-800/80 text-white'}`}>
                      {cam.status}
                    </span>
                    {cam.external && (
                      <span className="px-2 py-1 text-xs font-bold rounded-md bg-blue-500 text-white">
                        קישור חיצוני
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <h4 className="font-bold text-slate-900 dark:text-white truncate">{cam.name}</h4>
                  <p className="text-sm text-slate-500">{cam.location}</p>
                  {cam.source && (
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">מקור: {cam.source}</p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditModal(cam)}>
                      <Pencil className="w-4 h-4 mr-2 ml-1" /> ערוך
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(cam.$id!)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingCam ? 'ערוך מצלמה' : 'הוסף מצלמה חדשה'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">שם המצלמה</label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="לדוגמה: חיפה - בת גלים"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">מיקום</label>
              <Input 
                value={location} 
                onChange={e => setLocation(e.target.value)} 
                placeholder="לדוגמה: חיפה"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">קישור למצלמה (URL)</label>
              <Input 
                value={url} 
                onChange={e => setUrl(e.target.value)} 
                placeholder="קישור Embed או קישור לאתר"
                className="text-left"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">קישור לתמונה מקדימה (Thumbnail)</label>
              <Input 
                value={thumbnail} 
                onChange={e => setThumbnail(e.target.value)} 
                placeholder="URL של התמונה"
                className="text-left"
                dir="ltr"
              />
            </div>
            <div className="flex items-center justify-between border border-slate-200 dark:border-slate-800 rounded-md p-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">סטטוס המצלמה</span>
                <span className="text-xs text-slate-500">האם היא משדרת כרגע?</span>
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIVE">LIVE</SelectItem>
                  <SelectItem value="OFFLINE">OFFLINE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border border-slate-200 dark:border-slate-800 rounded-md p-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">אזור המצלמה</span>
                <span className="text-xs text-slate-500">לדוגמה: צפון, מרכז</span>
              </div>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="בחר אזור" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="צפון">צפון</SelectItem>
                  <SelectItem value="שרון">שרון</SelectItem>
                  <SelectItem value="מרכז">מרכז</SelectItem>
                  <SelectItem value="דרום">דרום</SelectItem>
                  <SelectItem value="כנרת">כנרת</SelectItem>
                  <SelectItem value="אילת">אילת</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">קישור חיצוני</label>
              <div className="flex items-center justify-between border border-slate-200 dark:border-slate-800 rounded-md p-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">פתיחה בטאב חדש</span>
                  <span className="text-xs text-slate-500">למצלמות שחוסמות Embed</span>
                </div>
                <Switch checked={external} onCheckedChange={setExternal} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">מקור הצילום (אופציונלי)</label>
              <Input 
                value={source} 
                onChange={e => setSource(e.target.value)} 
                placeholder="לדוגמה: עיריית חיפה"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>ביטול</Button>
            <Button onClick={handleSubmit} disabled={!name || !url || addCam.isPending || updateCam.isPending}>
              {editingCam ? 'שמור שינויים' : 'הוסף מצלמה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
