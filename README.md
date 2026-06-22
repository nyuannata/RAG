# RAG Chatbot Dokumen Perusahaan 🚀

Aplikasi **RAG (Retrieval-Augmented Generation) Chatbot Dokumen Perusahaan** modern, production-ready, dan memiliki performa tinggi. Aplikasi ini memungkinkan pengguna mengunggah dokumen internal (seperti SOP, pedoman teknis, manual pengguna, dsb.) dalam berbagai format dan melakukan obrolan (tanya jawab) interaktif secara kontekstual lengkap dengan **kutipan rujukan sumber halaman**.

---

## 🛠️ Stack Teknologi

### Frontend (Next.js App Router)
* **Next.js 15.5** - Framework React modern dengan optimasi server & client routing.
* **TypeScript** - Strict type-safety untuk penulisan kode yang andal.
* **Tailwind CSS v4** - Styling visual premium, adaptif, responsif, dan mendukung *dark mode* bawaan.
* **Zustand** - State management yang ringan, cepat, dan terintegrasi dengan LocalStorage.
* **TanStack React Query (v5)** - Sinkronisasi data server, caching, dan manajemen status mutasi data.
* **Framer Motion** - Micro-animations dan transisi UI yang halus dan premium.
* **Lucide React** - Set ikon SVG modern berkualitas tinggi.

### Backend (FastAPI Python)
* **FastAPI** - Framework web Python berkinerja tinggi berbasis ASGI.
* **SQLAlchemy (Async)** - ORM untuk database PostgreSQL menggunakan query non-blocking (`asyncpg`).
* **JWT & bcrypt** - Keamanan token otentikasi serta hashing kata sandi aman.

### RAG Pipeline & AI
* **LangChain** - Framework orkestrasi pipeline AI, chunking, dan model embedding.
* **OpenAI API (`gpt-4o-mini`)** - LLM cerdas, hemat token, dan responsif.
* **OpenAI Embeddings (`text-embedding-3-small`)** - Generator vektor dimensi presisi tinggi.
* **ChromaDB** - Database vektor *embedded persistent* untuk menyimpan index chunks dokumen.
* **pypdf & python-docx** - Library parsing ekstraksi teks per halaman untuk PDF dan Word.

---

## 🌟 Fitur Utama

1. **Multi-Tenant Authentication**: Registrasi, login dengan password terenkripsi, token JWT aman, dan pembatasan akses data (*multi-tenant isolation*).
2. **Dashboard Dokumen Modern**: Mengunggah berkas PDF, DOCX, TXT, MD melalui *Drag & Drop* interaktif lengkap dengan penunjuk progres (*upload progress*) dan validasi ukuran berkas (maks. 10MB).
3. **Advanced RAG Pipeline**: Ekstraksi teks otomatis, pemotongan teks cerdas (*Recursive Character Splitting* dengan overlap), penyusunan index vektor di ChromaDB via background worker.
4. **Multi-Document Selection**: Obrolan kontekstual dengan kemampuan memilih dokumen referensi tertentu (*single* atau *multiple docs*) sebagai basis data tanya jawab AI.
5. **Streaming Chat (SSE)** - Jawaban chatbot di-stream secara real-time (kata demi kata) menggunakan *Server-Sent Events* untuk UX interaktif yang mulus.
6. **Kutipan & Rujukan Presisi**: Rujukan sumber halaman PDF/dokumen asli yang dapat diklik untuk menampilkan potongan teks konteks referensi asli (*citations popover*).
7. **Penyimpanan History Otomatis**: Riwayat obrolan disimpan secara otomatis di PostgreSQL.

---

## 📂 Struktur Proyek

```text
/
├── backend/
│   ├── app/
│   │   ├── api/             # REST Endpoints (auth, docs, chat)
│   │   ├── auth/            # JWT & bcrypt security
│   │   ├── core/            # Config & logging
│   │   ├── db/              # SQLAlchemy Async & session maker
│   │   ├── models/          # ORM Models (User, Document, ChatSession, ChatMessage)
│   │   ├── schemas/         # Pydantic Schemas validation
│   │   ├── rag/             # Ingest Pipeline & Chatbot Generator (SSE)
│   └── package.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Panduan Menjalankan Aplikasi secara Lokal

### Opsi A: Menggunakan Docker Compose (Sangat Direkomendasikan 🐋)

Cara tercepat untuk menjalankan PostgreSQL, FastAPI Backend, dan Next.js Frontend dalam satu perintah.

1. **Salin berkas `.env` dan masukkan API Key Anda**:
   ```bash
   cp .env.example .env
   ```
   Buka file `.env` baru Anda dan isi `OPENAI_API_KEY` dengan kunci OpenAI API Anda yang valid.

2. **Jalankan Docker Compose**:
   ```bash
   docker-compose up --build
   ```

3. **Akses Aplikasi**:
   * Frontend Web UI: `http://localhost:3000`
   * Backend REST API Docs: `http://localhost:8000/docs`

---

### Opsi B: Menjalankan Secara Manual (Development Mode)

#### 1. Setup Database (PostgreSQL)
Pastikan Anda memiliki server PostgreSQL lokal yang sedang berjalan di port `5432` dengan database bernama `rag_chatbot` (atau sesuaikan URI di file `.env`).

#### 2. Jalankan Python Backend (FastAPI)
1. Pindah ke direktori backend:
   ```bash
   cd backend
   ```
2. Buat & aktifkan virtual environment Python:
   ```bash
   python -m venv venv
   # Di Windows:
   .\venv\Scripts\activate
   # Di Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependensi backend:
   ```bash
   pip install -r requirements.txt
   ```
4. Jalankan server FastAPI:
   ```bash
   python app/main.py
   ```
   *Server backend akan berjalan di `http://localhost:8000` dan secara otomatis menginisialisasi tabel database jika belum ada.*

#### 3. Jalankan Next.js Frontend
1. Buka terminal baru dan pindah ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Install dependensi Node:
   ```bash
   npm install
   ```
3. Jalankan development server:
   ```bash
   npm run dev
   ```
   *Frontend akan berjalan di `http://localhost:3000`.*

---

## 🛡️ Best Practices & Keamanan yang Diimplementasikan

* **Isolasi Data (Multi-Tenant)**: Penyaringan pencarian vektor ChromaDB menggunakan filter metadata `user_id` untuk memastikan pengguna hanya dapat merujuk ke dokumen milik mereka sendiri.
* **Token Hashing & JWT**: Password pengguna di-hash menggunakan algoritma `bcrypt` satu arah. Akses sesi diamankan dengan JWT yang memiliki batas waktu kedaluwarsa.
* **Streaming Instan**: SSE mengurangi latensi persepsi pengguna dengan mengirimkan kata demi kata segera setelah LLM OpenAI mulai menghasilkan token.
* **Dynamic Table Creation**: Backend FastAPI secara otomatis menyusun dan memvalidasi skema PostgreSQL di startup untuk memudahkan proses setup awal MVP.
