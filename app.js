// app.js
document.addEventListener("DOMContentLoaded", function() {
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

  let currentEquipmentID = "";

  // Equipment data mapping equipmentID to drawing image URL
  const equipmentData = {
    "223-CH-308": { drawing: "images/223-CH-308.jpg" },
    "223-CH-306": { drawing: "images/223-CH-306.jpg" },
    "224-CH326": { drawing: "images/224-CH326.jpg" },
    "224-CH-328": { drawing: "images/224-CH-328.jpg" }
  };

  // Equipment selection buttons
  document.querySelectorAll(".equipment-button").forEach(button => {
    button.addEventListener("click", function() {
      currentEquipmentID = this.getAttribute("data-equipment-id");
      showEquipmentDetail(currentEquipmentID);
    });
  });

  backToDashboardBtn.addEventListener("click", function() {
    equipmentDetail.style.display = "none";
    dashboard.style.display = "block";
    renderSummary();
  });

  // Show equipment detail page
  function showEquipmentDetail(equipmentID) {
    equipmentTitle.textContent = `Equipment ${equipmentID}`;
    equipmentDrawing.src = equipmentData[equipmentID].drawing;
    dashboard.style.display = "none";
    equipmentDetail.style.display = "block";
    loadCrackMarkers();
  }

  // Load crack markers from IndexedDB for current equipment
  function loadCrackMarkers() {
    // Remove existing markers
    document.querySelectorAll(".crack-marker").forEach(marker => marker.remove());
    db.cracks.where("equipmentID").equals(currentEquipmentID).toArray().then(cracks => {
      cracks.forEach(crack => renderCrackMarker(crack));
    });
  }

  // Render crack marker on equipment drawing
  function renderCrackMarker(crack) {
    const marker = document.createElement("div");
    marker.className = "crack-marker";
    // Determine marker color based on the most severe rating among its photos
    let severity = "3";
    if (crack.photos && crack.photos.length > 0) {
      severity = crack.photos.reduce((min, photo) => Math.min(min, parseInt(photo.severity)), 3).toString();
    }
    let color;
    if (severity === "1") color = "red";
    else if (severity === "2") color = "blue";
    else color = "pink";
    marker.style.backgroundColor = color;
    marker.style.width = "20px";
    marker.style.height = "20px";
    marker.style.borderRadius = "50%";
    marker.style.position = "absolute";
    marker.style.left = (crack.markerX - 10) + "px";
    marker.style.top = (crack.markerY - 10) + "px";
    marker.title = `${crack.crackID}`;
    // Clicking marker opens crack edit modal
    marker.addEventListener("click", function(event) {
      event.stopPropagation();
      openCrackModal("edit", crack);
    });
    drawingContainer.appendChild(marker);
  }

  // When clicking on drawing (not on a marker), open modal to create a new crack instance
  equipmentDrawing.addEventListener("click", function(event) {
    // Only open new modal if click is not on an existing marker
    if (event.target === equipmentDrawing) {
      const rect = equipmentDrawing.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      openCrackModal("new", { markerX: x, markerY: y });
    }
  });

  // Close modals
  closeCrackModal.addEventListener("click", closeCrackModalFunc);
  closeSummaryModal.addEventListener("click", closeSummaryModalFunc);
  window.addEventListener("click", function(event) {
    if (event.target == crackModal) closeCrackModalFunc();
    if (event.target == summaryModal) closeSummaryModalFunc();
  });

  function closeCrackModalFunc() {
    crackModal.style.display = "none";
    crackModalBody.innerHTML = "";
  }
  function closeSummaryModalFunc() {
    summaryModal.style.display = "none";
    summaryModalBody.innerHTML = "";
  }

  // Open crack modal in "new" or "edit" mode
  function openCrackModal(mode, crackData) {
    crackModal.style.display = "block";
    if (mode === "new") {
      // New crack instance modal: form to add first photo and note.
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
      document.getElementById("newCrackForm").addEventListener("submit", function(e) {
        e.preventDefault();
        const markerX = parseFloat(document.getElementById("newMarkerX").value);
        const markerY = parseFloat(document.getElementById("newMarkerY").value);
        const note = document.getElementById("newNoteInput").value;
        const severity = document.getElementById("newSeveritySelect").value;
        const timestamp = new Date().toISOString();
        const file = document.getElementById("newPhotoInput").files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(ev) {
            const photoData = ev.target.result;
            // Create new crack record with one photo in the photos array
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
              db.cracks.add(newCrack).then(() => {
                loadCrackMarkers();
                if (navigator.onLine) syncData();
              });
            });
          };
          reader.readAsDataURL(file);
        }
        closeCrackModalFunc();
      });
    } else if (mode === "edit") {
      // Edit mode: crackData is the existing crack record.
      let galleryHTML = `<h3>Edit Crack: ${crackData.crackID}</h3>`;
      if (crackData.photos && crackData.photos.length > 0) {
        galleryHTML += `<div id="photoGallery">`;
        crackData.photos.forEach((photo, index) => {
          galleryHTML += `
            <div class="gallery-item" data-index="${index}">
              <img src="${photo.photoData}" alt="Crack Photo ${index+1}" class="gallery-photo">
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
      // Form to add an additional photo to this crack instance
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

      // Add photo to existing crack
      document.getElementById("addPhotoForm").addEventListener("submit", function(e) {
        e.preventDefault();
        const file = document.getElementById("addPhotoInput").files[0];
        const note = document.getElementById("addNoteInput").value;
        const severity = document.getElementById("addSeveritySelect").value;
        const timestamp = new Date().toISOString();
        if (file) {
          const reader = new FileReader();
          reader.onload = function(ev) {
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
                if (navigator.onLine) syncData();
                openCrackModal("edit", record);
              });
            });
          };
          reader.readAsDataURL(file);
        }
      });

      // Delete individual photo from crack
      document.querySelectorAll(".delete-photo").forEach(btn => {
        btn.addEventListener("click", function() {
          const index = parseInt(this.getAttribute("data-index"));
          db.cracks.get(crackData.id).then(record => {
            record.photos.splice(index, 1);
            db.cracks.put(record).then(() => {
              loadCrackMarkers();
              if (navigator.onLine) syncData();
              openCrackModal("edit", record);
            });
          });
        });
      });

      // Delete entire crack instance
      document.getElementById("deleteCrack").addEventListener("click", function() {
        if (confirm("Are you sure you want to delete this crack?")) {
          db.cracks.delete(crackData.id).then(() => {
            loadCrackMarkers();
            if (navigator.onLine) {
              dbFirestore.collection("cracks").doc(crackData.crackID).delete().catch(console.error);
            }
            closeCrackModalFunc();
          });
        }
      });
    }
  }

  // Open summary modal for an equipment: list all cracks with options to edit or delete
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
                    <img src="${photo.photoData}" alt="Crack Photo ${index+1}" class="gallery-photo">
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
      // Attach events for summary modal buttons
      document.querySelectorAll(".edit-crack-summary").forEach(btn => {
        btn.addEventListener("click", function() {
          const id = parseInt(this.getAttribute("data-crack-id"));
          db.cracks.get(id).then(crack => {
            openCrackModal("edit", crack);
          });
        });
      });
      document.querySelectorAll(".delete-crack-summary").forEach(btn => {
        btn.addEventListener("click", function() {
          const id = parseInt(this.getAttribute("data-crack-id"));
          if (confirm("Are you sure you want to delete this crack?")) {
            db.cracks.get(id).then(crack => {
              db.cracks.delete(id).then(() => {
                if (navigator.onLine && crack) {
                  dbFirestore.collection("cracks").doc(crack.crackID).delete().catch(console.error);
                }
                openSummaryModal(equipmentID);
                loadCrackMarkers();
              });
            });
          }
        });
      });
      document.querySelectorAll(".delete-photo-summary").forEach(btn => {
        btn.addEventListener("click", function() {
          const id = parseInt(this.getAttribute("data-crack-id"));
          const index = parseInt(this.getAttribute("data-index"));
          db.cracks.get(id).then(record => {
            record.photos.splice(index, 1);
            db.cracks.put(record).then(() => {
              if (navigator.onLine) syncData();
              openSummaryModal(equipmentID);
              loadCrackMarkers();
            });
          });
        });
      });
    });
  }

  // Render the summary section on the dashboard
  function renderSummary() {
    summaryContent.innerHTML = "";
    Object.keys(equipmentData).forEach(equipmentID => {
      db.cracks.where("equipmentID").equals(equipmentID).toArray().then(cracks => {
        let severe = cracks.filter(c => c.photos && c.photos.some(p => p.severity === "1")).length;
        let moderate = cracks.filter(c => c.photos && c.photos.some(p => p.severity === "2")).length;
        let low = cracks.filter(c => c.photos && c.photos.some(p => p.severity === "3")).length;
        let total = cracks.length;
        const div = document.createElement("div");
        div.className = "summary-item";
        div.innerHTML = `<strong>${equipmentID}</strong> - Total Cracks: ${total} <br>
          Severe: ${severe}, Moderate: ${moderate}, Low: ${low}
          <br><button data-equipment-id="${equipmentID}" class="edit-summary">Edit Summary</button>
          <button data-equipment-id="${equipmentID}" class="view-summary">View Details</button>`;
        summaryContent.appendChild(div);
        div.querySelector(".edit-summary").addEventListener("click", function() {
          openSummaryModal(equipmentID);
        });
        div.querySelector(".view-summary").addEventListener("click", function() {
          openSummaryModal(equipmentID);
        });
      });
    });
  }

  // Sync unsynced records to Firebase Firestore
  function syncData() {
    db.cracks.where("synced").equals(false).toArray().then(cracks => {
      cracks.forEach(crack => {
        dbFirestore.collection("cracks").doc(crack.crackID).set(crack)
        .then(() => {
          db.cracks.update(crack.id, { synced: true });
          renderSummary();
        })
        .catch(error => {
          console.error("Sync error:", error);
        });
      });
    });
  }

  // Real-time listener: When online, listen for remote changes and update local IndexedDB
  if (navigator.onLine) {
    dbFirestore.collection("cracks").onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        const remoteCrack = change.doc.data();
        // Upsert remote record into local IndexedDB based on crackID
        db.cracks.where("crackID").equals(remoteCrack.crackID).toArray().then(existing => {
          if (existing.length === 0) {
            remoteCrack.synced = true;
            db.cracks.add(remoteCrack);
          } else {
            remoteCrack.id = existing[0].id;
            remoteCrack.synced = true;
            db.cracks.put(remoteCrack);
          }
        });
      });
      // Refresh UI
      if (currentEquipmentID) loadCrackMarkers();
      renderSummary();
    });
  }

  // Also trigger a sync on online event
  window.addEventListener("online", function() {
    syncData();
  });

  // Initial render of summary
  renderSummary();
});
