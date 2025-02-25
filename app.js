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
  
  let currentEquipmentID = "";
  
  // Equipment data: mapping equipmentID to drawing image URL (adjust paths as needed)
  const equipmentData = {
    "223-CH-308": { drawing: "images/223-CH-308.jpg" },
    "223-CH-306": { drawing: "images/223-CH-306.jpg" },
    "224-CH326": { drawing: "images/224-CH326.jpg" },
    "224-CH-328": { drawing: "images/224-CH-328.jpg" },
  };
  
  // -----------------------
  // Original Offline Functionality
  // Equipment selection and detail view
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
    loadCrackMarkers();
  }
  
  function loadCrackMarkers() {
    console.log("Loading crack markers for equipment: " + currentEquipmentID);
    document.querySelectorAll(".crack-marker").forEach(marker => marker.remove());
    db.cracks.where("equipmentID").equals(currentEquipmentID).toArray().then(cracks => {
      console.log("Found " + cracks.length + " cracks for " + currentEquipmentID);
      cracks.forEach(crack => renderCrackMarker(crack));
    }).catch(err => console.error("Error loading cracks:", err));
  }
  
  function renderCrackMarker(crack) {
    const marker = document.createElement("div");
    marker.className = "crack-marker";
    marker.style.position = "absolute";
    marker.style.width = "20px";
    marker.style.height = "20px";
    marker.style.borderRadius = "50%";
    marker.style.left = (crack.markerX - 10) + "px";
    marker.style.top = (crack.markerY - 10) + "px";
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
  
  equipmentDrawing.addEventListener("click", function (event) {
    if (event.target === equipmentDrawing) {
      const rect = equipmentDrawing.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      console.log("Drawing clicked at: ", x, y);
      openCrackModal("new", { markerX: x, markerY: y });
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
  
  // Helper: Add new crack to IndexedDB (offline-only)
  function addNewCrack(newCrack, callback) {
    // Offline mode: simply add the record
    newCrack.synced = false;
    db.cracks.add(newCrack).then(callback);
  }
  
  // Open crack modal (new or edit)
  function openCrackModal(mode, crackData) {
    console.log("Opening crack modal in mode:", mode, "for", crackData.crackID || "new crack");
    crackModal.style.display = "block";
    if (mode === "new") {
      const formHTML = `
        <h3>Add New Crack</h3>
        <form id="newCrackForm">
          <input type="hidden" id="newMarkerX" value="${crackData.markerX}">
          <input type="hidden" id="newMarkerY" value="${crackData.markerY}">
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
        const markerX = parseFloat(document.getElementById("newMarkerX").value);
        const markerY = parseFloat(document.getElementById("newMarkerY").value);
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
                markerX: markerX,
                markerY: markerY,
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
  
  // ------------------------
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
