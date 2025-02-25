// app.js
document.addEventListener("DOMContentLoaded", function () {
  console.log("App loaded.");
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

  let currentEquipmentID = "";

  // Equipment data: mapping equipmentID to drawing image URL
  const equipmentData = {
    "223-CH-308": { drawing: "images/223-CH-308.jpg" },
    "223-CH-306": { drawing: "images/223-CH-306.jpg" },
    "224-CH326": { drawing: "images/224-CH326.jpg" },
    "224-CH-328": { drawing: "images/224-CH-328.jpg" },
  };

  // Equipment selection buttons
  const equipmentButtons = document.querySelectorAll(".equipment-button");
  console.log("Found " + equipmentButtons.length + " equipment buttons.");
  equipmentButtons.forEach((button) => {
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

  // Show equipment detail page
  function showEquipmentDetail(equipmentID) {
    console.log("Showing equipment detail for: " + equipmentID);
    equipmentTitle.textContent = `Equipment ${equipmentID}`;
    equipmentDrawing.src = equipmentData[equipmentID].drawing;
    dashboard.style.display = "none";
    equipmentDetail.style.display = "block";
    loadCrackMarkers();
  }

  // Load crack markers from IndexedDB for current equipment
  function loadCrackMarkers() {
    console.log("Loading crack markers for equipment: " + currentEquipmentID);
    document.querySelectorAll(".crack-marker").forEach((marker) => marker.remove());
    db.cracks
      .where("equipmentID")
      .equals(currentEquipmentID)
      .toArray()
      .then((cracks) => {
        console.log("Found " + cracks.length + " cracks for equipment " + currentEquipmentID);
        cracks.forEach((crack) => renderCrackMarker(crack));
      })
      .catch((err) => console.error("Error loading cracks:", err));
  }

  // Render a crack marker on the equipment drawing
  function renderCrackMarker(crack) {
    const marker = document.createElement("div");
    marker.className = "crack-marker";
    let severity = "3";
    if (crack.photos && crack.photos.length > 0) {
      severity = crack.photos.reduce(
        (min, photo) => Math.min(min, parseInt(photo.severity)),
        3
      ).toString();
    }
    const color = severity === "1" ? "red" : severity === "2" ? "blue" : "pink";
    marker.style.backgroundColor = color;
    marker.style.width = "20px";
    marker.style.height = "20px";
    marker.style.borderRadius = "50%";
    marker.style.position = "absolute";
    marker.style.left = (crack.markerX - 10) + "px";
    marker.style.top = (crack.markerY - 10) + "px";
    marker.title = crack.crackID;
    marker.addEventListener("click", function (event) {
      event.stopPropagation();
      console.log("Marker clicked for crack:", crack.crackID);
      openCrackModal("edit", crack);
    });
    drawingContainer.appendChild(marker);
  }

  // When clicking on the equipment drawing (not on a marker), open modal to create a new crack
  equipmentDrawing.addEventListener("click", function (event) {
    if (event.target === equipmentDrawing) {
      const rect = equipmentDrawing.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      console.log("Drawing clicked at:", x, y);
      openCrackModal("new", { markerX: x, markerY: y });
    }
  });

  // Modal close functions
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

  // Helper: Write a new crack record to Firestore if online; otherwise, store locally
  function addNewCrack(newCrack, callback) {
    if (navigator.onLine) {
      console.log("Online: Writing new crack to Firestore:", newCrack.crackID);
      firebase.firestore().collection("cracks").doc(newCrack.crackID).set(newCrack)
        .then(function () {
          console.log("Crack synced to Firestore:", newCrack.crackID);
          newCrack.synced = true;
          return db.cracks.add(newCrack);
        })
        .then(callback)
        .catch(function (error) {
          console.error("Error writing new crack to Firestore:", error);
          newCrack.synced = false;
          return db.cracks.add(newCrack).then(callback);
        });
    } else {
      console.log("Offline: Storing new crack locally:", newCrack.crackID);
      newCrack.synced = false;
      db.cracks.add(newCrack).then(callback);
    }
  }

  // Open crack modal in "new" or "edit" mode
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
        console.log("New crack form submitted. File object:", file);
        if (file) {
          // Upload file to Firebase Storage
          db.cracks.where("equipmentID").equals(currentEquipmentID).count().then(function (count) {
            const crackNumber = count + 1;
            const crackID = `${currentEquipmentID}-Crack${crackNumber}`;
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child("crack_images/" + crackID + "_" + Date.now() + "_" + file.name);
            fileRef.put(file).then(snapshot => {
              return snapshot.ref.getDownloadURL();
            }).then(downloadURL => {
              console.log("File uploaded. Download URL:", downloadURL);
              const newCrack = {
                equipmentID: currentEquipmentID,
                crackID: crackID,
                markerX: markerX,
                markerY: markerY,
                photos: [{
                  photoURL: downloadURL,
                  note: note,
                  severity: severity,
                  timestamp: timestamp
                }],
                synced: false
              };
              addNewCrack(newCrack, function () {
                loadCrackMarkers();
                if (navigator.onLine) syncData();
              });
            }).catch(error => {
              console.error("Error uploading file:", error);
            });
          });
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
              <img src="${photo.photoURL}" alt="Crack Photo ${index + 1}" class="gallery-photo">
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
          const storageRef = firebase.storage().ref();
          const fileRef = storageRef.child("crack_images/" + crackData.crackID + "_" + Date.now() + "_" + file.name);
          fileRef.put(file).then(snapshot => {
            return snapshot.ref.getDownloadURL();
          }).then(downloadURL => {
            console.log("Additional photo uploaded. Download URL:", downloadURL);
            db.cracks.get(crackData.id).then(function (record) {
              record.photos.push({
                photoURL: downloadURL,
                note: note,
                severity: severity,
                timestamp: timestamp
              });
              if (navigator.onLine) {
                firebase.firestore().collection("cracks").doc(record.crackID).set(record)
                  .then(function () {
                    console.log("Updated crack synced to Firestore:", record.crackID);
                    record.synced = true;
                    return db.cracks.put(record);
                  })
                  .then(function () {
                    loadCrackMarkers();
                    syncData();
                    openCrackModal("edit", record);
                  })
                  .catch(function (error) {
                    console.error("Error updating crack in Firestore:", error);
                    db.cracks.put(record).then(function () {
                      loadCrackMarkers();
                      openCrackModal("edit", record);
                    });
                  });
              } else {
                db.cracks.put(record).then(function () {
                  loadCrackMarkers();
                  openCrackModal("edit", record);
                });
              }
            });
          }).catch(error => {
            console.error("Error uploading additional photo:", error);
          });
        }
      });
      document.querySelectorAll(".delete-photo").forEach((btn) => {
        btn.addEventListener("click", function () {
          const index = parseInt(this.getAttribute("data-index"));
          db.cracks.get(crackData.id).then(function (record) {
            record.photos.splice(index, 1);
            if (navigator.onLine) {
              firebase.firestore().collection("cracks").doc(record.crackID).set(record)
                .then(function () {
                  record.synced = true;
                  return db.cracks.put(record);
                })
                .then(function () {
                  loadCrackMarkers();
                  openCrackModal("edit", record);
                })
                .catch(function (error) {
                  console.error("Error deleting photo in Firestore:", error);
                  db.cracks.put(record).then(function () {
                    loadCrackMarkers();
                    openCrackModal("edit", record);
                  });
                });
            } else {
              db.cracks.put(record).then(function () {
                loadCrackMarkers();
                openCrackModal("edit", record);
              });
            }
          });
        });
      });
      document.getElementById("deleteCrack").addEventListener("click", function () {
        if (confirm("Are you sure you want to delete this crack?")) {
          db.cracks.delete(crackData.id).then(function () {
            loadCrackMarkers();
            if (navigator.onLine) {
              firebase.firestore().collection("cracks").doc(crackData.crackID).delete().catch(console.error);
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
    db.cracks.where("equipmentID").equals(equipmentID).toArray().then(function (cracks) {
      if (cracks.length === 0) {
        summaryModalBody.innerHTML += `<p>No cracks recorded for this equipment.</p>`;
      } else {
        cracks.forEach(function (crack) {
          summaryModalBody.innerHTML += `
            <div class="summary-crack-item" data-id="${crack.id}">
              <h4>${crack.crackID}</h4>
              <div class="summary-crack-photos">
                ${crack.photos.map((photo, index) => `
                  <div class="gallery-item" data-index="${index}">
                    <img src="${photo.photoURL}" alt="Crack Photo ${index + 1}" class="gallery-photo">
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
      document.querySelectorAll(".edit-crack-summary").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-crack-id"));
          db.cracks.get(id).then(function (crack) {
            openCrackModal("edit", crack);
          });
        });
      });
      document.querySelectorAll(".delete-crack-summary").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-crack-id"));
          if (confirm("Are you sure you want to delete this crack?")) {
            db.cracks.get(id).then(function (crack) {
              db.cracks.delete(id).then(function () {
                if (navigator.onLine && crack) {
                  firebase.firestore().collection("cracks").doc(crack.crackID).delete().catch(console.error);
                }
                openSummaryModal(equipmentID);
                loadCrackMarkers();
              });
            });
          }
        });
      });
      document.querySelectorAll(".delete-photo-summary").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-crack-id"));
          const index = parseInt(this.getAttribute("data-index"));
          db.cracks.get(id).then(function (record) {
            record.photos.splice(index, 1);
            if (navigator.onLine) {
              firebase.firestore().collection("cracks").doc(record.crackID).set(record)
                .then(function () {
                  record.synced = true;
                  return db.cracks.put(record);
                })
                .then(function () {
                  openSummaryModal(equipmentID);
                  loadCrackMarkers();
                })
                .catch(function (error) {
                  console.error("Error deleting photo in summary:", error);
                  db.cracks.put(record).then(function () {
                    openSummaryModal(equipmentID);
                    loadCrackMarkers();
                  });
                });
            } else {
              db.cracks.put(record).then(function () {
                openSummaryModal(equipmentID);
                loadCrackMarkers();
              });
            }
          });
        });
      });
    });
  }

  // Render the summary section on the dashboard
  function renderSummary() {
    console.log("Rendering summary");
    summaryContent.innerHTML = "";
    Object.keys(equipmentData).forEach(function (equipmentID) {
      db.cracks.where("equipmentID").equals(equipmentID).toArray().then(function (cracks) {
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

  // Sync unsynced records from IndexedDB to Firestore
  function syncData() {
    console.log("Syncing unsynced records");
    db.cracks.where("synced").equals(false).toArray().then(function (cracks) {
      cracks.forEach(function (crack) {
        firebase.firestore().collection("cracks").doc(crack.crackID).set(crack)
          .then(function () {
            console.log("Synced crack:", crack.crackID);
            db.cracks.update(crack.id, { synced: true });
            renderSummary();
          })
          .catch(function (error) {
            console.error("Sync error for", crack.crackID, ":", error);
          });
      });
    });
  }

  // Real-time Firestore listener to update local IndexedDB on remote changes
  if (navigator.onLine) {
    firebase.firestore().collection("cracks").onSnapshot(function (snapshot) {
      console.log("onSnapshot triggered");
      snapshot.docChanges().forEach(function (change) {
        const remoteCrack = change.doc.data();
        db.cracks.where("crackID").equals(remoteCrack.crackID).toArray().then(function (existing) {
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
      if (currentEquipmentID) loadCrackMarkers();
      renderSummary();
    });
  }

  // Also trigger sync on online event
  window.addEventListener("online", function () {
    console.log("Online event triggered");
    syncData();
  });

  // Force Sync Button Listener
  const forceSyncButton = document.getElementById("forceSync");
  if (forceSyncButton) {
    forceSyncButton.addEventListener("click", function () {
      console.log("Force Sync button clicked");
      syncData();
    });
  }

  // Initial render of summary
  renderSummary();
});
