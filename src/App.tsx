const fetchGoogleSheet = async (url: string): Promise<any[][]> => {
    try {
      // Extract ID and GID from the URL
      const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!idMatch) {
        throw new Error("Invalid Google Sheets URL. Please make sure it contains /d/SPREADSHEET_ID");
      }
      const id = idMatch[1];
      
      const gidMatch = url.match(/[?&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      
      const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;

      const response = await fetch(exportUrl);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Access Denied (Status ${response.status}). Please ensure the Google Sheet sharing settings are set to "Anyone with the link can view".`);
        }
        throw new Error(`Failed to fetch sheet from Google. Status: ${response.status}`);
      }
      const text = await response.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    } catch (err: any) {
      throw new Error(`Error fetching Google Sheet: ${err.message}`);
    }
  };
