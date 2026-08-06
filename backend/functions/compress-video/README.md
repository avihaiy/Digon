# פונקציית כיווץ וידאו (Reels Compression) - Appwrite

פונקציה זו מאזינה להעלאת קבצים חדשים למאגר (Bucket), מורידה את הוידאו, רצה עליו עם `FFmpeg` כדי להקטין את גודלו ולהעביר את ה-`moov atom` להתחלה (מה שפותר את בעיית ה"מסך השחור" והטעינה האיטית באייפון), ואז מחליפה את הקובץ הישן בקובץ החדש.

## הוראות התקנה

מכיוון שאין לי גישה לפרויקט ה-Appwrite שלך, עליך לפרוס (Deploy) את הפונקציה הזו בעצמך. עקוב אחרי השלבים הבאים מהמחשב שלך:

### 1. התקנת Appwrite CLI
אם עדיין לא התקנת את שורת הפקודה של Appwrite, פתח את חלון הפקודות (Terminal) והרץ:
```bash
npm install -g appwrite-cli
```

### 2. התחברות לשרת שלך
הרץ את הפקודה הבאה והתחבר עם המייל והסיסמה של מנהל ה-Appwrite שלך:
```bash
appwrite login
```

### 3. קישור הפרויקט המקומי לשרת
בתיקייה הראשית של הפרויקט שלך (היכן שתיקיית `backend` נמצאת), הרץ:
```bash
appwrite init project
```
ובחר את הפרויקט `Digon` שלך מהרשימה.

### 4. פריסת הפונקציה (Deploy)
היכנס לתיקיית הפונקציה:
```bash
cd backend/functions/compress-video
```
והרץ:
```bash
appwrite functions create \
  --functionId="compress-video" \
  --name="Compress Reels Video" \
  --runtime="node-18.0" \
  --events="buckets.[REELS_BUCKET_ID].files.*.create" \
  --entrypoint="src/index.js"
```
*(החלף את `[REELS_BUCKET_ID]` ב-ID של ה-Bucket של ה-Reels שלך)*

לאחר מכן הרץ דיפלוי:
```bash
appwrite deploy function --functionId="compress-video"
```

### 5. הגדרת משתני סביבה (Environment Variables)
בתוך מסך ניהול הפונקציה ב-Appwrite Console, עבור ללשונית **Settings**, והוסף את המשתנים הבאים תחת **Variables**:
- `APPWRITE_ENDPOINT`: הכתובת של השרת שלך (למשל `https://cloud.appwrite.io/v1`)
- `APPWRITE_PROJECT_ID`: ה-ID של הפרויקט שלך
- `APPWRITE_API_KEY`: עליך לייצר API Key דרך מסך ההגדרות ב-Appwrite שיש לו הרשאות `files.read`, `files.write`, `files.delete`.
