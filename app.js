// app.js
document.addEventListener("DOMContentLoaded", function() {
  // Element references
  const dashboard = document.getElementById("dashboard");
  const equipmentDetail = document.getElementById("equipmentDetail");
  const backToDashboardBtn = document.getElementById("backToDashboard");
  const equipmentTitle = document.getElementById("equipmentTitle");
  const equipmentDrawing = document.getElementById("equipmentDrawing");
  const drawingContainer = document.getElementById("drawingContainer");
  const modal = document.getElementById("modal");
  const closeModal = document.getElementById("closeModal");
  const crackForm = document.getElementById("crackForm");
  const markerXInput = document.getElementById("markerX");
  const markerYInput = document.getElementById("markerY");
  const noteInput = document.getElementById("noteInput");
  const photoInput = document.getElementById("photoInput");
  const severitySelect = document.getElementById("severitySelect");
  const summaryContent = document.getElementById("summaryContent");

  let currentEquipmentID = "";

  // Equipment details: mapping equipmentID to drawing image URL (replace with your actual images)
  const equipmentData = {
    "223-CH-308": { drawing: "images/223-CH-308.jpg" },
    "223-CH-306": { drawing: "images/223-CH-306.jpg" },
    "224-CH326": { drawing: "images/224-CH326.jpg" },
    "224-CH-328": { drawing: "images/224-CH-328.jpg" }
  };

  // Set up event listeners for equipment selection
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

  // Display the equipment detail view
  function showEquipmentDetail(equipmentID) {
    equipmentTitle.textContent = `Equipment ${equipmentID}`;
    equipmentDrawing.src = equipmentData[equipmentID].drawing;
    dashboard.style.display = "none";
    equipmentDetail.style.display = "block";
    loadCrackMarkers();
  }

  // When the drawing is clicked, capture the click coordinates and open the modal
  equipmentDrawing.addEventListener("click", function(event) {
    const rect = equipmentDrawing.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    markerXInput.value = x;
    markerYInput.value = y;
    openModal();
  });

  // Modal open/close functions
  function openModal() {
    modal.style.display = "block";
  }
  function closeModalFunc() {
    modal.style.display = "none";
    crackForm.reset();
  }
  closeModal.addEventListener("click", closeModalFunc);
  window.addEventListener("click", function(event) {
    if (event.target == modal) {
      closeModalFunc();
    }
  });

  // Handle form submission to add a new crack record
  crackForm.addEventListener("submit", function(event) {
    event.preventDefault();
    const markerX = parseFloat(markerXInput.value);
    const markerY = parseFloat(markerYInput.value);
    const note = noteInput.value;
    const severity = severitySelect.value;
    const timestamp = new Date().toISOString();

    // Process photo file: convert to Base64 string
    const file = photoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const photoData = e.target.result; // Base64 image data
        addCrackEntry(markerX, markerY, note, severity, photoData, timestamp);
      };
      reader.readAsDataURL(file);
    }
    closeModalFunc();
  });

  // Add a crack entry to IndexedDB and render the marker
  function addCrackEntry(markerX, markerY, note, severity, photoData, timestamp) {
    // Generate a unique crackID by counting existing cracks for this equipment
    db.cracks.where("equipmentID").equals(currentEquipmentID).count().then(count => {
      const crackNumber = count + 1;
      const crackID = `${currentEquipmentID}-Crack${crackNumber}`;
      db.cracks.add({
        equipmentID: currentEquipmentID,
        crackID: crackID,
        markerX: markerX,
        markerY: markerY,
        note: note,
        severity: severity,
        photoData: photoData,
        timestamp: timestamp,
        synced: false
      }).then(() => {
        renderCrackMarker({ equipmentID: currentEquipmentID, crackID, markerX, markerY, severity, note, timestamp });
        // If online, trigger sync
        if (navigator.onLine) {
          syncData();
        }
      });
    });
  }

  // Load and render all crack markers for the current equipment
  function loadCrackMarkers() {
    // Remove existing markers
    document.querySelectorAll(".crack-marker").forEach(marker => marker.remove());
    db.cracks.where("equipmentID").equals(currentEquipmentID).toArray().then(cracks => {
      cracks.forEach(crack => renderCrackMarker(crack));
    });
  }

  // Render a single crack marker overlay on the equipment drawing
  function renderCrackMarker(crack) {
    const marker = document.createElement("div");
    marker.className = "crack-marker";
    let color;
    if (crack.severity == "1") color = "red";
    else if (crack.severity == "2") color = "blue";
    else if (crack.severity == "3") color = "pink";
    marker.style.backgroundColor = color;
    marker.style.width = "20px";
    marker.style.height = "20px";
    marker.style.borderRadius = "50%";
    marker.style.position = "absolute";
    marker.style.left = (crack.markerX - 10) + "px";
    marker.style.top = (crack.markerY - 10) + "px";
    marker.title = `${crack.crackID}: ${crack.note}`;
    // Click to view details (expandable to edit/delete)
    marker.addEventListener("click", function(event) {
      event.stopPropagation();
      alert(`Crack: ${crack.crackID}\nNote: ${crack.note}\nSeverity: ${crack.severity}\nTime: ${crack.timestamp}`);
      // You can add edit/delete functionality here.
    });
    drawingContainer.appendChild(marker);
  }

  // Sync unsynced records from IndexedDB to Firebase Firestore
  function syncData() {
    db.cracks.where("synced").equals(false).toArray().then(cracks => {
      cracks.forEach(crack => {
        dbFirestore.collection("cracks").doc(crack.crackID).set(crack)
        .then(() => {
          db.cracks.update(crack.id, { synced: true });
          console.log(`Synced: ${crack.crackID}`);
          renderSummary();
        })
        .catch(error => {
          console.error("Sync error:", error);
        });
      });
    });
  }

  // Listen for when connectivity is restored to trigger a sync
  window.addEventListener("online", syncData);

  // Render the summary section on the dashboard (aggregated crack counts and severity per equipment)
  function renderSummary() {
    summaryContent.innerHTML = "";
    Object.keys(equipmentData).forEach(equipmentID => {
      db.cracks.where("equipmentID").equals(equipmentID).toArray().then(cracks => {
        let severe = cracks.filter(c => c.severity == "1").length;
        let moderate = cracks.filter(c => c.severity == "2").length;
        let low = cracks.filter(c => c.severity == "3").length;
        let total = cracks.length;
        const div = document.createElement("div");
        div.className = "summary-item";
        div.innerHTML = `<strong>${equipmentID}</strong> - Total Cracks: ${total} <br>
          Severe: ${severe}, Moderate: ${moderate}, Low: ${low}
          <br><button data-equipment-id="${equipmentID}" class="edit-summary">Edit Summary</button>`;
        summaryContent.appendChild(div);
        div.querySelector(".edit-summary").addEventListener("click", function() {
          alert(`Edit summary for ${equipmentID}`);
          // Here you can implement a modal to adjust severity category or add comments.
        });
      });
    });
  }

  // Initial summary render on page load
  renderSummary();
});
