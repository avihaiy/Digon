import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";

interface TickerItem {
  id: string;
  text: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

export default function TickerManager() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ticker_items").select("*").order("order_index", { ascending: true });
    if (!error && data) setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const addItem = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index)) + 1 : 0;
    const { error } = await supabase.from("ticker_items").insert({
      text: newText.trim(),
      is_active: true,
      order_index: maxOrder,
    });
    if (!error) {
      setNewText("");
      fetchItems();
    }
    setSaving(false);
  };

  const toggleItem = async (item: TickerItem) => {
    await supabase.from("ticker_items").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("ticker_items").delete().eq("id", id);
    fetchItems();
  };

  const updateText = async (id: string, text: string) => {
    await supabase.from("ticker_items").update({ text }).eq("id", id);
    fetchItems();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-amber-900">🎞️ ניהול טיקר תחתון</h2>

      {/* הוספה */}
      <div className="flex gap-3 mb-6">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="הכנס טקסט לטיקר..."
          className="flex-1 border border-amber-300 rounded-lg px-4 py-2 text-right bg-amber-50 focus:outline-none focus:border-amber-500"
          dir="rtl"
        />
        <button
          onClick={addItem}
          disabled={saving || !newText.trim()}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוסף
        </button>
      </div>

      {/* רשימה */}
      {loading ? (
        <div className="text-center text-amber-600 py-8">טוען...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-amber-400 py-8 border-2 border-dashed border-amber-200 rounded-xl">
          אין פריטים בטיקר
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                item.is_active ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200 opacity-60"
              }`}
            >
              <GripVertical className="w-4 h-4 text-amber-400 cursor-grab flex-shrink-0" />

              <input
                defaultValue={item.text}
                onBlur={(e) => {
                  if (e.target.value !== item.text) updateText(item.id, e.target.value);
                }}
                className="flex-1 bg-transparent text-right focus:outline-none focus:bg-white focus:px-2 rounded transition-all"
                dir="rtl"
              />

              <button
                onClick={() => toggleItem(item)}
                className={`p-1.5 rounded-lg transition-colors ${
                  item.is_active ? "text-green-600 hover:bg-green-100" : "text-gray-400 hover:bg-gray-100"
                }`}
                title={item.is_active ? "הסתר" : "הצג"}
              >
                {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <button
                onClick={() => deleteItem(item.id)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-100 transition-colors"
                title="מחק"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-amber-500 mt-4 text-center">הטיקר יוצג בתחתית מסך התצוגה • לחץ על הטקסט לעריכה</p>
    </div>
  );
}
