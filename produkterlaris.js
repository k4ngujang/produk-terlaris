        function showUploadOptions() {
            Swal.fire({
                title: 'Pilih Format',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'File Excel',
                denyButtonText: 'Data Text',
                cancelButtonText: 'Kembali',
                allowOutsideClick: false,
                customClass: {
                    confirmButton: 'excel-button'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    showExcelUploadDialog();
                } else if (result.isDenied) {
                    showTextUploadDialog();
                }
            });
        }

        function showExcelUploadDialog(existingFile) {
            Swal.fire({
                title: 'Upload File Excel',
                input: 'file',
                inputAttributes: {
                    'accept': '.xlsx, .xls, .csv',
                    'aria-label': 'Upload your Excel file'
                },
                inputValue: existingFile || null,
                showCancelButton: true,
                confirmButtonText: 'Import Data',
                cancelButtonText: 'Kembali',
                allowOutsideClick: false,
                customClass: {
                    confirmButton: 'uploadfile-button'
                }
            }).then((fileResult) => {
                if (fileResult.isDismissed) {
                    showUploadOptions();
                } else if (fileResult.value) {
                    checkFileFormat(fileResult.value, 'excel');
                } else {
                    showWarning('Anda harus mengunggah file untuk melanjutkan.', showExcelUploadDialog);
                }
            });
        }

        function showTextUploadDialog(existingText) {
            Swal.fire({
                title: 'Enter Text Data',
                input: 'textarea',
                inputPlaceholder: 'Enter text data here...',
                inputValue: existingText || '',
                showCancelButton: true,
                confirmButtonText: 'Import Data',
                cancelButtonText: 'Kembali',
                allowOutsideClick: false,
                customClass: {
                    confirmButton: 'uploadfile-button'
                }
            }).then((textResult) => {
                if (textResult.isDismissed) {
                    showUploadOptions();
                } else if (textResult.value) {
                    checkTextFormat(textResult.value, 'text');
                } else {
                    showWarning('Anda harus memasukkan data teks untuk melanjutkan.', showTextUploadDialog);
                }
            });
        }

        function checkFileFormat(file, type) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length > 0 && jsonData[0][0] === 'Nama Produk' && jsonData[0][1] === 'Kode Produk' && jsonData[0][2] === 'Status' && jsonData[0][3] === 'Profit') {
                    showUploadConfirmation(() => uploadfileTableFromFile(file), type, file);
                } else {
                    showWarning('Format file yang anda masukan salah. Silahkan cek video tutorialnya!', showExcelUploadDialog);
                }
            };
            reader.readAsArrayBuffer(file);
        }

        function checkTextFormat(textData, type) {
            const lines = textData.split('\n');
            if (lines.length > 0 && lines[0].trim().split(/\s+/)[0] === 'Nama' && lines[0].trim().split(/\s+/)[1] === 'Produk') {
                showUploadConfirmation(() => uploadfileTableFromText(textData), type, textData);
            } else {
                showWarning('Format data yang diinput salah, Silahkan coba lagi dengan format yang benar!', showTextUploadDialog);
            }
        }

        function showUploadConfirmation(callback, type, inputData) {
            Swal.fire({
                title: 'Konfirmasi',
                html: '<div style="font-size: 15px; font-family: Calibri;">Transaksi hanya akan dihitung jika Status Transaksi adalah "SUCCESS". Data dengan status lain, seperti "Failed", tidak akan dihitung karena Tools ini hanya menghitung berdasarkan Status Transaksi "SUCCESS".<br><br>Jika Anda sudah yakin, silakan klik "Lanjutkan".</div>',
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Lanjutkan',
                cancelButtonText: 'Batal',
                allowOutsideClick: false,
                customClass: {
                    confirmButton: 'uploadfile-button',
                    cancelButton: 'swal2-cancel swal2-styled'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    callback();
                } else if (result.isDismissed) {
                    if (type === 'excel') {
                        showExcelUploadDialog(inputData);
                    } else if (type === 'text') {
                        showTextUploadDialog(inputData);
                    }
                }
            });
        }

        function uploadfileTableFromFile(file) {
            Swal.fire({
                title: 'Memproses...',
                text: 'Mohon ditunggu, sedang memproses data.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const reader = new FileReader();
            reader.onload = function (e) {
                setTimeout(() => {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData.length > 1) {
                        const transactions = {};
                        jsonData.slice(1).forEach(row => {
                            const namaProduk = row[0];
                            const kodeProduk = row[1];
                            const status = row[2];
                            const fee = parseFloat(row[3]);
                            const feeMultivendor = parseFloat(row[4]);
                            if (status === 'SUCCESS') {
                                if (transactions[kodeProduk]) {
                                    transactions[kodeProduk].count++;
                                    transactions[kodeProduk].totalProfit += fee;
                                    transactions[kodeProduk].totalFeeMultivendor += feeMultivendor;
                                } else {
                                    transactions[kodeProduk] = {
                                        namaProduk,
                                        count: 1,
                                        totalProfit: fee,
                                        totalFeeMultivendor: feeMultivendor,
                                        fee: fee,
                                        feeMultivendor: feeMultivendor
                                    };
                                }
                            }
                        });

                        const sortedTransactions = Object.keys(transactions).map(kodeProduk => ({
                            kodeProduk,
                            namaProduk: transactions[kodeProduk].namaProduk,
                            fee: transactions[kodeProduk].fee,
                            totalProfit: transactions[kodeProduk].totalProfit,
                            totalFeeMultivendor: transactions[kodeProduk].totalFeeMultivendor,
                            count: transactions[kodeProduk].count
                        })).sort((a, b) => b.count - a.count);

                        const resultTable = document.getElementById('resultTable').getElementsByTagName('tbody')[0];
                        resultTable.innerHTML = '';
                        sortedTransactions.forEach((item, index) => {
                            const row = resultTable.insertRow();
                            row.insertCell(0).innerText = index + 1;
                            row.insertCell(1).innerText = item.kodeProduk;
                            row.insertCell(2).innerText = item.namaProduk;
                            row.insertCell(3).innerText = formatNumber(item.fee);
                            row.insertCell(4).innerText = formatNumber(item.totalProfit);
                            row.insertCell(5).innerText = formatNumber(item.totalFeeMultivendor);
                            row.insertCell(6).innerText = item.count;
                        });

                        const totalAdminMultivendor = sortedTransactions.reduce((sum, item) => sum + item.totalFeeMultivendor, 0);
                        updateSummary(sortedTransactions.length, sortedTransactions.reduce((sum, item) => sum + item.totalProfit, 0), totalAdminMultivendor);

                        Swal.fire('Sukses', 'Data berhasil diimpor.', 'success');
                        showExportResetButtons();
                        document.getElementById('summary').style.display = 'block';
                    } else {
                        showWarning('File tidak mengandung data yang valid.', showExcelUploadDialog);
                    }
                }, 2000);
            };

            reader.readAsArrayBuffer(file);
        }
        function uploadfileTableFromText(textData) {
            Swal.fire({
                title: 'Processing...',
                text: 'Mohon ditunggu sedang proses import data.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            setTimeout(() => {
                const transactions = {};
                const lines = textData.split('\n');

                if (lines.length > 1 && lines[0].trim() !== "") {
                    lines.slice(1).forEach(line => {
                        const [namaProduk, kodeProduk, status, profit, feeMultivendor] = line.trim().split(/\t/);
                        if (status === 'SUCCESS') {
                            const profitValue = parseFloat(profit);
                            const feeMultivendorValue = parseFloat(feeMultivendor);
                            if (transactions[kodeProduk]) {
                                transactions[kodeProduk].count++;
                                transactions[kodeProduk].totalProfit += profitValue;
                                transactions[kodeProduk].totalFeeMultivendor += feeMultivendorValue;
                            } else {
                                transactions[kodeProduk] = {
                                    namaProduk,
                                    count: 1,
                                    profit: profitValue,
                                    feeMultivendor: feeMultivendorValue,
                                    totalProfit: profitValue,
                                    totalFeeMultivendor: feeMultivendorValue
                                };
                            }
                        }
                    });

                    const sortedTransactions = Object.keys(transactions).map(kodeProduk => ({
                        kodeProduk,
                        namaProduk: transactions[kodeProduk].namaProduk,
                        profit: transactions[kodeProduk].profit,
                        totalProfit: transactions[kodeProduk].totalProfit,
                        totalFeeMultivendor: transactions[kodeProduk].totalFeeMultivendor,
                        count: transactions[kodeProduk].count
                    })).sort((a, b) => b.count - a.count);

                    const resultTable = document.getElementById('resultTable').getElementsByTagName('tbody')[0];
                    resultTable.innerHTML = '';
                    sortedTransactions.forEach((item, index) => {
                        const row = resultTable.insertRow();
                        row.insertCell(0).innerText = index + 1;
                        row.insertCell(1).innerText = item.kodeProduk;
                        row.insertCell(2).innerText = item.namaProduk;
                        row.insertCell(3).innerText = formatNumber(item.profit);
                        row.insertCell(4).innerText = formatNumber(item.totalProfit);
                        row.insertCell(5).innerText = formatNumber(item.totalFeeMultivendor);
                        row.insertCell(6).innerText = item.count;
                    });

                    const totalAdminMultivendor = sortedTransactions.reduce((sum, item) => sum + item.totalFeeMultivendor, 0);
                    updateSummary(sortedTransactions.length, sortedTransactions.reduce((sum, item) => sum + item.totalProfit, 0), totalAdminMultivendor);

                    Swal.fire('Success', 'Data berhasil diupload.', 'success');
                    showExportResetButtons();
                    document.getElementById('summary').style.display = 'block';
                } else {
                    showWarning('Data teks tidak mengandung informasi yang valid.', showTextUploadDialog);
                }
            }, 2000);
        }

        function updateSummary(jumlahProduk, totalProfit, totalAdminMultivendor) {
            const summary = document.getElementById('summary');
            summary.innerHTML = `Jumlah Produk: ${jumlahProduk} <br> Total Profit: ${formatNumber(totalProfit)} <br> Admin Multivendor: ${formatNumber(totalAdminMultivendor)}`;
        }

        function formatNumber(num) {
            return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,').replace(/\./g, ' ').replace(/,/g, '.').replace(/ /g, ',');
        }


        function updateSummary(jumlahProduk, totalProfit, totalAdminMultivendor) {
            const summary = document.getElementById('summary');
            summary.innerHTML = `Jumlah Produk: ${jumlahProduk} <br> Total Profit: ${formatNumber(totalProfit)} <br> Admin Multivendor: ${formatNumber(totalAdminMultivendor)}`;
        }

        function showExportResetButtons() {
            const uploadContainer = document.getElementById('uploadContainer');
            uploadContainer.innerHTML = `
        <button class="upload-container" style="background: green;" onclick="exportData()">Export Data</button>
        <button class="upload-container" onclick="resetData()">Reset Data</button>
    `;
        }

        function showWarning(message, retryCallback) {
            Swal.fire({
                title: 'Peringatan',
                text: message,
                icon: 'warning',
                confirmButtonText: 'Ok',
                allowOutsideClick: false,
                customClass: {
                    confirmButton: 'uploadfile-button'
                }
            }).then(() => {
                retryCallback();
            });
        }

        function exportData() {
            Swal.fire({
                title: 'Export Data',
                html: '<div style="font-size: 17px; text-align: center;">Tuliskan nama file sesuai keinginanmu.</div>',
                input: 'text',
                inputPlaceholder: 'Tuliskan nama file...',
                showCancelButton: true,
                confirmButtonText: 'Lanjutkan',
                cancelButtonText: 'Batal',
                allowOutsideClick: false,
                customClass: {
                    confirmButton: 'uploadfile-button',
                    cancelButton: 'swal2-cancel swal2-styled'
                }
            }).then((result) => {
                if (result.dismiss === Swal.DismissReason.cancel) {
                    return; // Jika tombol Batal diklik, keluar dari fungsi tanpa melakukan apapun
                }

                if (!result.value) {
                    Swal.fire({
                        title: 'Peringatan',
                        html: 'Harap masukkan nama file. Misalnya "Produk Terlaris Juni 2024" silahkan bisa diisi sesuai keinginan.',
                        icon: 'warning',
                        confirmButtonText: 'Ok',
                        allowOutsideClick: false,
                        customClass: {
                            confirmButton: 'uploadfile-button'
                        }
                    }).then(() => {
                        exportData(); // Kembali ke popup export data jika nama file tidak diisi
                    });
                } else {
                    const fileName = result.value;
                    Swal.fire({
                        title: 'Exporting...',
                        text: 'Harap ditunggu, sedang proses export data.',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    setTimeout(() => {
                        try {
                            exportToExcel(fileName);
                            Swal.fire('Success', 'Data berhasil diexport.', 'success');
                        } catch (error) {
                            Swal.fire('Error', 'Gagal mengekspor data.', 'error');
                        }
                    }, 2000);
                }
            });
        }

        function exportToExcel(fileName) {
            const table = document.getElementById('resultTable');
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([]);

            // Convert HTML table to array of arrays
            const rows = table.getElementsByTagName('tr');
            for (let i = 0; i < rows.length; i++) {
                const row = [];
                const cells = rows[i].getElementsByTagName(i === 0 ? 'th' : 'td');
                for (let j = 0; j < cells.length; j++) {
                    row.push(cells[j].innerText);
                }
                XLSX.utils.sheet_add_aoa(ws, [row], { origin: -1 });
            }

            // Apply styles to the sheet cells
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[cell_address]) ws[cell_address] = {};
                    if (!ws[cell_address].s) ws[cell_address].s = {};
                    ws[cell_address].s.border = {
                        top: { style: "thin", color: { auto: 1 } },
                        bottom: { style: "thin", color: { auto: 1 } },
                        left: { style: "thin", color: { auto: 1 } },
                        right: { style: "thin", color: { auto: 1 } }
                    };
                    ws[cell_address].s.alignment = { vertical: "center", horizontal: "center" };
                    ws[cell_address].s.font = { name: "Calibri", sz: 11 };
                }
            }

            // Apply bold font to the header row
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = XLSX.utils.encode_cell({ r: 0, c: C });
                if (!ws[cell_address]) ws[cell_address] = {};
                if (!ws[cell_address].s) ws[cell_address].s = {};
                ws[cell_address].s.font = { bold: true, name: "Calibri", sz: 11 };
            }

            // Append the worksheet to the workbook
            const sheetName = 'Produk Terlaris';
            XLSX.utils.book_append_sheet(wb, ws, sheetName);

            // Write the workbook to a file
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        }


        function updateTableText(isTableVisible) {
            const infoText = document.querySelector('p.calibri-font');
            if (isTableVisible) {
                infoText.innerHTML = 'Mantappp... <br>Total produk terlaris sudah muncul nih! ðŸ˜</br>';
            } else {
                infoText.innerHTML = 'Cek produk terlaris melalui Tools ini, Semoga Bermanfaat.';
            }
        }

        // Call this function to update the text when the table is updated
        function showExportResetButtons() {
            const uploadContainer = document.getElementById('uploadContainer');
            uploadContainer.innerHTML = `
        <button class="upload-container" style="background: green;" onclick="exportData()">Export Data</button>
        <button class="upload-container" onclick="resetData()">Reset Data</button>
    `;
            updateTableText(true);
        }

        // Call this function to reset the text when the table is reset
        function resetData() {
            const resultTable = document.getElementById('resultTable').getElementsByTagName('tbody')[0];
            resultTable.innerHTML = '';
            const uploadContainer = document.getElementById('uploadContainer');
            uploadContainer.innerHTML = `
        <button id="uploadButton" onclick="showUploadOptions()">Upload Data</button>
        <button id="tutorialButton" onclick="showCustomTutorial()">Tutorial</button>
    `;
            const summary = document.getElementById('summary');
            summary.style.display = 'none';
            summary.innerHTML = 'Jumlah Produk: <br> Total Profit:';
            updateTableText(false);

            Swal.fire({
                title: 'Success',
                text: 'Data berhasil direset.',
                icon: 'success',
                confirmButtonText: 'Ok',
                allowOutsideClick: false,
                customClass: {
                    confirmButton: 'uploadfile-button'
                }
            });
        }


        function showWarning(message, retryCallback) {
            Swal.fire({
                title: 'Peringatan',
                text: message,
                icon: 'warning',
                confirmButtonText: 'Ok',
                allowOutsideClick: false,
                customClass: {
                    confirmButton: 'uploadfile-button'
                }
            }).then(() => {
                retryCallback();
            });
        }

        function formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        }

        function showCustomTutorial() {
            const overlay = document.getElementById('customPopupOverlay');
            const videoFrame = document.getElementById('tutorialVideo');
            const loadingSpinner = document.getElementById('loadingSpinner');

            // Show the overlay
            overlay.style.display = 'flex';

            // Ensure the video plays properly by reloading the iframe source
            videoFrame.src += "&autoplay=1";

            // Show the spinner until the video is loaded
            videoFrame.onload = () => {
                loadingSpinner.style.display = 'none';
                videoFrame.style.display = 'block';
            };
        }

        function closeCustomPopup() {
            const overlay = document.getElementById('customPopupOverlay');
            const videoFrame = document.getElementById('tutorialVideo');            // Hide the overlay
            overlay.style.display = 'none';

            // Stop the video and reset the iframe source
            videoFrame.src = videoFrame.src.replace("&autoplay=1", "");
            videoFrame.style.display = 'none';
            const loadingSpinner = document.getElementById('loadingSpinner');
            loadingSpinner.style.display = 'flex';
        }

        const style = document.createElement('style');
        style.innerHTML = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;
        document.head.appendChild(style);
