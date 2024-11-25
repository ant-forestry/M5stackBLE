const DEVICE_NAME = "m5-stack";
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

let device = null;
let server = null;
let characteristic = null;
let isConnected = false;

// ログを画面に表示する関数
function logMessage(message) {
    const logDiv = document.getElementById("log");
    const timestamp = new Date().toLocaleTimeString();
    logDiv.innerHTML = `[${timestamp}] ${message}<br>` + logDiv.innerHTML;
    logDiv.scrollTop = logDiv.scrollHeight;
    console.log(`[${timestamp}] ${message}`);
}

// ステータス更新
function updateStatus(status) {
    const statusElement = document.getElementById("status-text");
    statusElement.innerText = status;
}

// デバイス接続
async function connectToDevice() {
    try {
        logMessage("デバイスをスキャン中...");
        device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: false,
            filters: [{ name: DEVICE_NAME }],
            optionalServices: [SERVICE_UUID],
        });

        logMessage(`[${device.name}]に接続中...`);
        server = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        characteristic = await service.getCharacteristic(CHAR_UUID);

        logMessage("接続成功！");
        isConnected = true;
        toggleConnectionState(true);
        sendLedOff()
    } catch (error) {
        logMessage(`接続エラー: ${error.message}`);
    }
}

// デバイス切断
async function disconnectDevice() {
    try {
	    if (device && device.gatt.connected) {
	    	sendLedOff();
	        device.gatt.disconnect();
	        logMessage("デバイスから切断しました。");
	        isConnected = false;
	        toggleConnectionState(false);
	        updateStatus("未接続");
	    }
	} catch (error) {
        logMessage(`デバイスの切断中にエラーが発生しました: ${error.message}`);
    }
}

// 接続状態の切り替え
function toggleConnectionState(connected) {
    document.getElementById("connect-button").style.display = connected ? "none" : "block";
    document.getElementById("disconnect-button").style.display = !connected ? "none" : "block";
    document.getElementById("connected").style.display = connected ? "block" : "none";
}

// コマンド送信
async function sendCommand(command, data = []) {
    if (!characteristic) {
        logMessage("デバイスが接続されていません。");
        return;
    }
    try {
        const message = new Uint8Array([command, ...data]);
        await characteristic.writeValue(message);
        await logMessage(`送信: ${Array.from(message).map(v => `0x${v.toString(16)}`).join(" ")}`);
    } catch (error) {
        logMessage(`送信失敗: ${error.message}`);
    }
}

// LED制御コマンド
function sendLedOff() {
    updateStatus("LED消灯");
    sendCommand(0x01);
}

function sendLedOn() {
    updateStatus("LED点灯");
    sendCommand(0x02);
}

function sendBlink() {
    const blinkInterval = parseInt(document.getElementById("blink-interval").value, 10);
    const highByte = (blinkInterval >> 8) & 0xFF;
    const lowByte = blinkInterval & 0xFF;
    updateStatus(`LED点滅(${blinkInterval}ms)`);
    sendCommand(0x03, [highByte, lowByte]);
}

// 各モードのコマンド送信
function sendMode(mode) {
	updateStatus(`点灯パターン${mode + 1}`);
    sendCommand(0x04 + mode);
}

// ログの表示切り替え
function toggleLog() {
    const logDiv = document.getElementById("log");
    logDiv.style.display = logDiv.style.display === "none" ? "block" : "none";
    this.textContent = logDiv.style.display === "none" ? "ログ表示" : "ログ非表示";
}

// 点滅間隔の同期
function syncBlinkInterval() {
    const range = document.getElementById("blink-interval");
    const input = document.getElementById("blink-input");
    input.value = range.value;
}

// 点滅間隔の反映
function updateBlinkRange() {
    const range = document.getElementById("blink-interval");
    const input = document.getElementById("blink-input");
    range.value = input.value;
}

// イベントリスナー
document.getElementById("connect-button").addEventListener("click", connectToDevice);
document.getElementById("disconnect-button").addEventListener("click", disconnectDevice);
document.getElementById("led-off").addEventListener("click", sendLedOff);
document.getElementById("led-on").addEventListener("click", sendLedOn);
document.getElementById("blink-button").addEventListener("click", sendBlink);
document.getElementById("blink-interval").addEventListener("input", syncBlinkInterval);
document.getElementById("blink-input").addEventListener("input", updateBlinkRange);
document.getElementById("toggle-log").addEventListener("click", toggleLog);
document.querySelectorAll(".mode-button").forEach((btn, index) => {
    btn.addEventListener("click", () => sendMode(index));
});
