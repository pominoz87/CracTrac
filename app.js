// app.js
document.addEventListener("DOMContentLoaded", function () {
  console.log("App loaded (Offline Only).");
  
  // Element references
  const dashboard = document.getElementById("dashboard");
  const equipmentDetail = document.getElementById("equipmentDetail");
  const backToDashboardBtn = document.getElementById("backToDashboard");
  const equipmentTitle = document.getElementById("equipmentTitle");
  const equipmentDrawing = document.getElementById("equipmentDrawing");
  const drawingContainer = document.getElementById("drawingContainer");
  const summaryContent = document.getElementById("summaryContent");
  
  const crackModal = document.getElementById("crackModal");
  const crackModalBody = document.getElementById("crackModalBody");
  const closeCrackModal = document.getElementById("closeCrackModal");
  
  const summaryModal = document.getElementById("summaryModal");
  const summaryModalBody = document.getElementById("summaryModalBody");
  const closeSummaryModal = document.getElementById("closeSummaryModal");
  
  const importFileInput = document.getElementById("importFileInput");
  const importDataButton = document.getElementById("importData");
  const exportDataButton = document.getElementById("exportData");
  const generateReportButton = document.getElementById("generateReport");
  
  let currentEquipmentID = "";
  
  // Equipment data: mapping equipmentID to drawing image URL
  const equipmentData = {
    "223-CH-308": { drawing: "images/223-CH-308.jpg" },
    "223-CH-306": { drawing: "images/223-CH-306.jpg" },
    "224-CH326": { drawing: "images/224-CH326.jpg" },
    "224-CH-328": { drawing: "images/224-CH-328.jpg" }
  };
  
  // ---------------------------
  // Original Offline Functionality
  
  // Equipment selection
  document.querySelectorAll(".equipment-button").forEach((button) => {
    button.addEventListener("click", function () {
      const equipmentID = this.getAttribute("data-equipment-id");
      console.log("Equipment button clicked: " + equipmentID);
      currentEquipmentID = equipmentID;
      showEquipmentDetail(equipmentID);
    });
  });
  
  backToDashboardBtn.addEventListener("click", function () {
    console.log("Back to Dashboard clicked.");
    equipmentDetail.style.display = "none";
    dashboard.style.display = "block";
    renderSummary();
  });
  
  function showEquipmentDetail(equipmentID) {
    console.log("Showing equipment detail for: " + equipmentID);
    equipmentTitle.textContent = `Equipment ${equipmentID}`;
    equipmentDrawing.src = equipmentData[equipmentID].drawing;
    dashboard.style.display = "none";
    equipmentDetail.style.display = "block";
    equipmentDrawing.onload = function () {
      loadCrackMarkers();
    };
  }
  
  function loadCrackMarkers() {
    console.log("Loading crack markers for equipment: " + currentEquipmentID);
    document.querySelectorAll(".crack-marker").forEach(marker => marker.remove());
    db.cracks.where("equipmentID").equals(currentEquipmentID).toArray().then(cracks => {
      console.log("Found " + cracks.length + " cracks for " + currentEquipmentID);
      cracks.forEach(crack => renderCrackMarker(crack));
    }).catch(err => console.error("Error loading cracks:", err));
  }
  
  // Render a crack marker using natural coordinates stored in the record
  function renderCrackMarker(crack) {
    const marker = document.createElement("div");
    marker.className = "crack-marker";
    marker.style.position = "absolute";
    marker.style.width = "20px";
    marker.style.height = "20px";
    marker.style.borderRadius = "50%";
    
    // Get displayed position and dimensions of the equipment image
    const imgRect = equipmentDrawing.getBoundingClientRect();
    const containerRect = drawingContainer.getBoundingClientRect();
    const offsetLeft = imgRect.left - containerRect.left;
    const offsetTop = imgRect.top - containerRect.top;
    
    // Calculate normalized position based on natural coordinates stored as naturalX, naturalY
    const normX = crack.naturalX / equipmentDrawing.naturalWidth;
    const normY = crack.naturalY / equipmentDrawing.naturalHeight;
    const displayX = offsetLeft + normX * imgRect.width;
    const displayY = offsetTop + normY * imgRect.height;
    marker.style.left = (displayX - 10) + "px";
    marker.style.top = (displayY - 10) + "px";
    
    let severity = "3";
    if (crack.photos && crack.photos.length > 0) {
      severity = crack.photos.reduce((min, photo) => Math.min(min, parseInt(photo.severity)), 3).toString();
    }
    marker.style.backgroundColor = severity === "1" ? "red" : severity === "2" ? "blue" : "pink";
    marker.title = crack.crackID;
    marker.addEventListener("click", function (event) {
      event.stopPropagation();
      console.log("Marker clicked for " + crack.crackID);
      openCrackModal("edit", crack);
    });
    drawingContainer.appendChild(marker);
  }
  
  // When clicking on the equipment drawing, compute natural coordinates from click position
  equipmentDrawing.addEventListener("click", function (event) {
    if (event.target === equipmentDrawing) {
      const imgRect = equipmentDrawing.getBoundingClientRect();
      const clickX = event.clientX - imgRect.left;
      const clickY = event.clientY - imgRect.top;
      const naturalX = clickX * (equipmentDrawing.naturalWidth / imgRect.width);
      const naturalY = clickY * (equipmentDrawing.naturalHeight / imgRect.height);
      console.log("Drawing clicked at natural coordinates:", naturalX.toFixed(2), naturalY.toFixed(2));
      openCrackModal("new", { naturalX: naturalX, naturalY: naturalY });
    }
  });
  
  closeCrackModal.addEventListener("click", closeCrackModalFunc);
  closeSummaryModal.addEventListener("click", closeSummaryModalFunc);
  window.addEventListener("click", function (event) {
    if (event.target === crackModal) closeCrackModalFunc();
    if (event.target === summaryModal) closeSummaryModalFunc();
  });
  
  function closeCrackModalFunc() {
    console.log("Closing crack modal.");
    crackModal.style.display = "none";
    crackModalBody.innerHTML = "";
  }
  
  function closeSummaryModalFunc() {
    console.log("Closing summary modal.");
    summaryModal.style.display = "none";
    summaryModalBody.innerHTML = "";
  }
  
  // Helper: Add new crack record to IndexedDB (offline-only)
  function addNewCrack(newCrack, callback) {
    newCrack.synced = false;
    db.cracks.add(newCrack).then(callback);
  }
  
  // Open crack modal (for new or edit)
  function openCrackModal(mode, crackData) {
    console.log("Opening crack modal in mode:", mode, "for", crackData.crackID || "new crack");
    crackModal.style.display = "block";
    if (mode === "new") {
      const formHTML = `
        <h3>Add New Crack</h3>
        <form id="newCrackForm">
          <input type="hidden" id="newNaturalX" value="${crackData.naturalX}">
          <input type="hidden" id="newNaturalY" value="${crackData.naturalY}">
          <label for="newPhotoInput">Photo:</label>
          <input type="file" id="newPhotoInput" accept="image/*" capture="environment" required>
          <label for="newNoteInput">Note:</label>
          <textarea id="newNoteInput" placeholder="Enter note" required></textarea>
          <label for="newSeveritySelect">Severity:</label>
          <select id="newSeveritySelect" required>
            <option value="1">Severe (Red)</option>
            <option value="2">Moderate (Blue)</option>
            <option value="3">Low (Pink)</option>
          </select>
          <button type="submit">Save</button>
        </form>
      `;
      crackModalBody.innerHTML = formHTML;
      document.getElementById("newCrackForm").addEventListener("submit", function (e) {
        e.preventDefault();
        const naturalX = parseFloat(document.getElementById("newNaturalX").value);
        const naturalY = parseFloat(document.getElementById("newNaturalY").value);
        const note = document.getElementById("newNoteInput").value;
        const severity = document.getElementById("newSeveritySelect").value;
        const timestamp = new Date().toISOString();
        const file = document.getElementById("newPhotoInput").files[0];
        console.log("New crack form submitted. File:", file);
        if (file) {
          const reader = new FileReader();
          reader.onload = function (ev) {
            const photoData = ev.target.result;
            console.log("File read complete, length:", photoData.length);
            db.cracks.where("equipmentID").equals(currentEquipmentID).count().then(count => {
              const crackNumber = count + 1;
              const crackID = `${currentEquipmentID}-Crack${crackNumber}`;
              const newCrack = {
                equipmentID: currentEquipmentID,
                crackID: crackID,
                naturalX: naturalX,
                naturalY: naturalY,
                photos: [{
                  photoData: photoData,
                  note: note,
                  severity: severity,
                  timestamp: timestamp
                }],
                synced: false
              };
              addNewCrack(newCrack, function () {
                loadCrackMarkers();
              });
            });
          };
          reader.onerror = function (ev) {
            console.error("Error reading file:", ev);
          };
          reader.readAsDataURL(file);
        } else {
          console.error("No file selected.");
        }
        closeCrackModalFunc();
      });
    } else if (mode === "edit") {
      let galleryHTML = `<h3>Edit Crack: ${crackData.crackID}</h3>`;
      if (crackData.photos && crackData.photos.length > 0) {
        galleryHTML += `<div id="photoGallery">`;
        crackData.photos.forEach((photo, index) => {
          galleryHTML += `
            <div class="gallery-item" data-index="${index}">
              <img src="${photo.photoData}" alt="Photo ${index + 1}" class="gallery-photo">
              <p>Note: ${photo.note}</p>
              <p>Severity: ${photo.severity === "1" ? "Severe" : photo.severity === "2" ? "Moderate" : "Low"}</p>
              <p>Time: ${photo.timestamp}</p>
              <button class="delete-photo" data-index="${index}">Delete Photo</button>
            </div>
          `;
        });
        galleryHTML += `</div>`;
      } else {
        galleryHTML += `<p>No photos available.</p>`;
      }
      galleryHTML += `
        <h4>Add Additional Photo</h4>
        <form id="addPhotoForm">
          <label for="addPhotoInput">Photo:</label>
          <input type="file" id="addPhotoInput" accept="image/*" capture="environment" required>
          <label for="addNoteInput">Note:</label>
          <textarea id="addNoteInput" placeholder="Enter note" required></textarea>
          <label for="addSeveritySelect">Severity:</label>
          <select id="addSeveritySelect" required>
            <option value="1">Severe (Red)</option>
            <option value="2">Moderate (Blue)</option>
            <option value="3">Low (Pink)</option>
          </select>
          <button type="submit">Add Photo</button>
        </form>
        <button id="deleteCrack">Delete Entire Crack</button>
      `;
      crackModalBody.innerHTML = galleryHTML;
      document.getElementById("addPhotoForm").addEventListener("submit", function (e) {
        e.preventDefault();
        const file = document.getElementById("addPhotoInput").files[0];
        const note = document.getElementById("addNoteInput").value;
        const severity = document.getElementById("addSeveritySelect").value;
        const timestamp = new Date().toISOString();
        if (file) {
          const reader = new FileReader();
          reader.onload = function (ev) {
            const photoData = ev.target.result;
            db.cracks.get(crackData.id).then(record => {
              record.photos.push({
                photoData: photoData,
                note: note,
                severity: severity,
                timestamp: timestamp
              });
              db.cracks.put(record).then(() => {
                loadCrackMarkers();
                openCrackModal("edit", record);
              });
            });
          };
          reader.readAsDataURL(file);
        }
      });
      document.querySelectorAll(".delete-photo").forEach(btn => {
        btn.addEventListener("click", function () {
          const index = parseInt(this.getAttribute("data-index"));
          db.cracks.get(crackData.id).then(record => {
            record.photos.splice(index, 1);
            db.cracks.put(record).then(() => {
              loadCrackMarkers();
              openCrackModal("edit", record);
            });
          });
        });
      });
      document.getElementById("deleteCrack").addEventListener("click", function () {
        if (confirm("Are you sure you want to delete this crack?")) {
          db.cracks.delete(crackData.id).then(() => {
            loadCrackMarkers();
            closeCrackModalFunc();
          });
        }
      });
    }
  }
  
  // Optional: Open summary modal for an equipment (if needed)
  function openSummaryModal(equipmentID) {
    summaryModal.style.display = "block";
    summaryModalBody.innerHTML = `<h3>Edit Summary for ${equipmentID}</h3>`;
    db.cracks.where("equipmentID").equals(equipmentID).toArray().then(cracks => {
      if (cracks.length === 0) {
        summaryModalBody.innerHTML += `<p>No cracks recorded for this equipment.</p>`;
      } else {
        cracks.forEach(crack => {
          summaryModalBody.innerHTML += `
            <div class="summary-crack-item" data-id="${crack.id}">
              <h4>${crack.crackID}</h4>
              <div class="summary-crack-photos">
                ${crack.photos.map((photo, index) => `
                  <div class="gallery-item" data-index="${index}">
                    <img src="${photo.photoData}" alt="Photo ${index + 1}" class="gallery-photo">
                    <p>Note: ${photo.note}</p>
                    <p>Severity: ${photo.severity === "1" ? "Severe" : photo.severity === "2" ? "Moderate" : "Low"}</p>
                    <p>Time: ${photo.timestamp}</p>
                    <button class="delete-photo-summary" data-crack-id="${crack.id}" data-index="${index}">Delete Photo</button>
                  </div>
                `).join('')}
              </div>
              <button class="edit-crack-summary" data-crack-id="${crack.id}">Edit Crack</button>
              <button class="delete-crack-summary" data-crack-id="${crack.id}">Delete Crack</button>
            </div>
          `;
        });
      }
      document.querySelectorAll(".edit-crack-summary").forEach(btn => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-crack-id"));
          db.cracks.get(id).then(crack => {
            openCrackModal("edit", crack);
          });
        });
      });
      document.querySelectorAll(".delete-crack-summary").forEach(btn => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-crack-id"));
          if (confirm("Delete this crack?")) {
            db.cracks.delete(id).then(() => {
              openSummaryModal(equipmentID);
              loadCrackMarkers();
            });
          }
        });
      });
      document.querySelectorAll(".delete-photo-summary").forEach(btn => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-crack-id"));
          const index = parseInt(this.getAttribute("data-index"));
          db.cracks.get(id).then(record => {
            record.photos.splice(index, 1);
            db.cracks.put(record).then(() => {
              openSummaryModal(equipmentID);
              loadCrackMarkers();
            });
          });
        });
      });
    });
  }
  
  // Render summary on dashboard
  function renderSummary() {
    console.log("Rendering summary");
    summaryContent.innerHTML = "";
    Object.keys(equipmentData).forEach(equipmentID => {
      db.cracks.where("equipmentID").equals(equipmentID).toArray().then(cracks => {
        const severe = cracks.filter(c => c.photos && c.photos.some(p => p.severity === "1")).length;
        const moderate = cracks.filter(c => c.photos && c.photos.some(p => p.severity === "2")).length;
        const low = cracks.filter(c => c.photos && c.photos.some(p => p.severity === "3")).length;
        const total = cracks.length;
        const div = document.createElement("div");
        div.className = "summary-item";
        div.innerHTML = `<strong>${equipmentID}</strong> - Total Cracks: ${total} <br>
          Severe: ${severe}, Moderate: ${moderate}, Low: ${low}
          <br><button data-equipment-id="${equipmentID}" class="edit-summary">Edit Summary</button>
          <button data-equipment-id="${equipmentID}" class="view-summary">View Details</button>`;
        summaryContent.appendChild(div);
        div.querySelector(".edit-summary").addEventListener("click", function () {
          openSummaryModal(equipmentID);
        });
        div.querySelector(".view-summary").addEventListener("click", function () {
          openSummaryModal(equipmentID);
        });
      });
    });
  }
  
  // ---------------------------
  // Data Export and Import Functions
  
  function exportDataToZip() {
    db.cracks.toArray().then(cracks => {
      console.log("Exporting " + cracks.length + " cracks to zip.");
      const zip = new JSZip();
      zip.file("cracks.json", JSON.stringify(cracks, null, 2));
      zip.generateAsync({ type: "blob" }).then(content => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = "CracTrac_Data.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("Export complete.");
      });
    });
  }
  
  function importDataFromFile() {
    const file = importFileInput.files[0];
    if (!file) {
      alert("Please select a JSON file to import.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const importedData = JSON.parse(e.target.result);
        db.cracks.clear().then(() => {
          return db.cracks.bulkAdd(importedData);
        }).then(() => {
          console.log("Import complete.");
          renderSummary();
          if (currentEquipmentID) {
            loadCrackMarkers();
          }
        }).catch(err => {
          console.error("Error during import:", err);
        });
      } catch (err) {
        alert("Error parsing JSON: " + err);
      }
    };
    reader.readAsText(file);
  }
  
  exportDataButton.addEventListener("click", function () {
    console.log("Export Data button clicked.");
    exportDataToZip();
  });
  
  importDataButton.addEventListener("click", function () {
    console.log("Import Data button clicked.");
    importDataFromFile();
  });
  
  // ---------------------------
  // Generate Report Feature
  
  generateReportButton.addEventListener("click", async function () {
    console.log("Generate Report button clicked.");
    await generateReport();
  });
  
  async function generateReport() {
    // Use jsPDF from the global jspdf.umd namespace
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    
    // Group cracks by equipment from IndexedDB
    const equipmentMap = {};
    const allCracks = await db.cracks.toArray();
    allCracks.forEach(crack => {
      if (!equipmentMap[crack.equipmentID]) equipmentMap[crack.equipmentID] = [];
      equipmentMap[crack.equipmentID].push(crack);
    });
    
    const equipmentIDs = Object.keys(equipmentData);
    let firstPage = true;
    for (const equipID of equipmentIDs) {
      if (!firstPage) {
        pdf.addPage();
      }
      firstPage = false;
      
      pdf.setFontSize(18);
      pdf.text(`Equipment: ${equipID}`, 10, 20);
      
      // Create a temporary container off-screen (positioned off-screen)
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.top = "-10000px";
      tempContainer.style.left = "-10000px";
      // Set container size to the natural dimensions of the equipment drawing
      // Use the natural dimensions of the image loaded from equipmentData
      const tempImg = new Image();
      tempImg.src = equipmentData[equipID].drawing;
      await new Promise((resolve) => {
        tempImg.onload = resolve;
        tempImg.onerror = resolve;
      });
      tempContainer.style.width = tempImg.naturalWidth + "px";
      tempContainer.style.height = tempImg.naturalHeight + "px";
      tempImg.width = tempImg.naturalWidth;
      tempImg.height = tempImg.naturalHeight;
      tempContainer.appendChild(tempImg);
      
      // Add markers for cracks on this equipment (using natural coordinates)
      if (equipmentMap[equipID]) {
        equipmentMap[equipID].forEach(crack => {
          const marker = document.createElement("div");
          marker.style.position = "absolute";
          marker.style.width = "20px";
          marker.style.height = "20px";
          marker.style.borderRadius = "50%";
          marker.style.border = "2px solid white";
          const posX = crack.naturalX - 10;
          const posY = crack.naturalY - 10;
          marker.style.left = posX + "px";
          marker.style.top = posY + "px";
          let severity = "3";
          if (crack.photos && crack.photos.length > 0) {
            severity = crack.photos.reduce((min, photo) => Math.min(min, parseInt(photo.severity)), 3).toString();
          }
          marker.style.backgroundColor = severity === "1" ? "red" : severity === "2" ? "blue" : "pink";
          tempContainer.appendChild(marker);
          
          // Add label next to marker
          const label = document.createElement("div");
          label.textContent = crack.crackID;
          label.style.position = "absolute";
          label.style.left = (posX + 22) + "px";
          label.style.top = posY + "px";
          label.style.fontSize = "12px";
          label.style.color = "black";
          tempContainer.appendChild(label);
        });
      }
      
      // Wait a moment to ensure the container is rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the container as an image using html2canvas, using PNG format
      const canvas = await html2canvas(tempContainer, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      
      // Remove the temporary container from the DOM
      document.body.removeChild(tempContainer);
      
      // Calculate dimensions to fit within the PDF page
      const pageWidth = pdf.internal.pageSize.getWidth() - 20;
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 10, 30, imgWidth, imgHeight);
      
      // List cracks below the drawing
      let startY = 30 + imgHeight + 10;
      pdf.setFontSize(12);
      if (equipmentMap[equipID] && equipmentMap[equipID].length > 0) {
        const sortedCracks = equipmentMap[equipID].sort((a, b) => {
          const numA = parseInt(a.crackID.split("Crack")[1]);
          const numB = parseInt(b.crackID.split("Crack")[1]);
          return numA - numB;
        });
        sortedCracks.forEach(crack => {
          pdf.text(`Crack: ${crack.crackID}`, 10, startY);
          startY += 6;
          crack.photos.forEach((photo, idx) => {
            pdf.text(`Photo ${idx+1}: Note: ${photo.note}, Severity: ${photo.severity}`, 10, startY);
            startY += 6;
          });
          startY += 4;
          if (startY > pdf.internal.pageSize.getHeight() - 20) {
            pdf.addPage();
            startY = 20;
          }
        });
      } else {
        pdf.text("No cracks recorded.", 10, startY);
      }
    }
    
    pdf.save("CracTrac_Report.pdf");
    console.log("Report generated and downloaded.");
  }
  
  // ---------------------------
  // Data Export and Import Functions
  
  function exportDataToZip() {
    db.cracks.toArray().then(cracks => {
      console.log("Exporting " + cracks.length + " cracks to zip.");
      const zip = new JSZip();
      zip.file("cracks.json", JSON.stringify(cracks, null, 2));
      zip.generateAsync({ type: "blob" }).then(content => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = "CracTrac_Data.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("Export complete.");
      });
    });
  }
  
  function importDataFromFile() {
    const file = importFileInput.files[0];
    if (!file) {
      alert("Please select a JSON file to import.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const importedData = JSON.parse(e.target.result);
        db.cracks.clear().then(() => {
          return db.cracks.bulkAdd(importedData);
        }).then(() => {
          console.log("Import complete.");
          renderSummary();
          if (currentEquipmentID) {
            loadCrackMarkers();
          }
        }).catch(err => {
          console.error("Error during import:", err);
        });
      } catch (err) {
        alert("Error parsing JSON: " + err);
      }
    };
    reader.readAsText(file);
  }
  
  exportDataButton.addEventListener("click", function () {
    console.log("Export Data button clicked.");
    exportDataToZip();
  });
  
  importDataButton.addEventListener("click", function () {
    console.log("Import Data button clicked.");
    importDataFromFile();
  });
  
  // Initial render of summary
  renderSummary();
});
