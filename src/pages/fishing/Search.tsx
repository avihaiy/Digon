import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, User, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_PROFILES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { BadgeIcon } from "@/components/fishing/BadgeIcon";
import { useSearchParams } from "react-router-dom";

export default function SearchUsers() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);

  // Debounce the search term to avoid spamming Appwrite
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["search-users", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return [];
      
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
          Query.search("full_name", debouncedSearch),
          Query.limit(20)
        ]);
        return res.documents;
      } catch (e) {
        console.error("Search failed", e);
        return [];
      }
    },
    enabled: debouncedSearch.trim().length > 0
  });

  return (
    <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto px-4 mt-6">
      
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          חיפוש דייגים <SearchIcon className="w-6 h-6 text-cyan-500" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          חפש דייגים בקהילה לפי שם, עקוב אחריהם ושלח להם הודעות!
        </p>
      </div>

      <div className="relative mt-4">
        <SearchIcon className="absolute right-3 top-3 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="חפש שם..."
          className="pr-10 h-12 rounded-2xl bg-white/5 border-white/10 text-lg"
          dir="auto"
        />
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : debouncedSearch && users.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            לא נמצאו דייגים העונים לחיפוש "{debouncedSearch}"
          </div>
        ) : !debouncedSearch ? (
          <div className="text-center p-8 text-muted-foreground">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
            הקלד שם כדי למצוא דייגים אחרים
          </div>
        ) : (
          users.map((profile) => (
            <Link key={profile.$id} to={`/profile/${profile.user_id}`}>
              <Card className="hover:bg-white/5 transition-colors cursor-pointer border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-cyan-900/30 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg truncate">
                        {profile.full_name || profile.user_name || "דייג"}
                      </h3>
                      {profile.title && (
                        <span className="text-[10px] bg-cyan-900/40 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                          {profile.title}
                        </span>
                      )}
                    </div>
                    {profile.badges?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {profile.badges.slice(0, 4).map((badgeId: string) => (
                          <BadgeIcon key={badgeId} badgeId={badgeId} />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

    </div>
  );
}
