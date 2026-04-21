import { useState } from "react";

export default function DashboardWebsiteSettings() {
  const [logo, setLogo] = useState(null);
  const [themeColor, setThemeColor] = useState("#ffffff");
  const [websiteTitle, setWebsiteTitle] = useState("My Website");
  const [profilePhoto, setProfilePhoto] = useState(null);

  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    setLogo(file);
  };

  const handleThemeColorChange = (event) => {
    setThemeColor(event.target.value);
  };

  const handleWebsiteTitleChange = (event) => {
    setWebsiteTitle(event.target.value);
  };

  const handleProfilePhotoChange = (event) => {
    const file = event.target.files[0];
    setProfilePhoto(file);
  };

  return (
    <div className="space-y-8">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Pengaturan Dashboard dan Website</h1>
          <p className="text-muted-foreground mt-2 text-lg">Kelola logo, tema warna, foto profil, dan pengaturan lainnya untuk website Anda.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Logo Website</label>
          <input type="file" onChange={handleLogoChange} className="mt-1 block w-full" />
          {logo && <p className="mt-2 text-sm text-gray-500">Logo telah dipilih.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Tema Warna</label>
          <input type="color" value={themeColor} onChange={handleThemeColorChange} className="mt-1 block w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Judul Website</label>
          <input type="text" value={websiteTitle} onChange={handleWebsiteTitleChange} className="mt-1 block w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Foto Profil</label>
          <input type="file" onChange={handleProfilePhotoChange} className="mt-1 block w-full" />
          {profilePhoto && <p className="mt-2 text-sm text-gray-500">Foto profil telah dipilih.</p>}
        </div>

        <button className="mt-6 px-4 py-2 bg-primary text-white rounded-lg shadow-md hover:bg-primary-dark">
          Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}