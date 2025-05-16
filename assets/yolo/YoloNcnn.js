function YoloV11() { }

let completeInti = false;

let allclass = {}

// 使用全局变量YOLO_RESOURCE_PATH（如果存在）或默认使用files.cwd()
let currentPath = typeof global.YOLO_RESOURCE_PATH !== 'undefined' ? global.YOLO_RESOURCE_PATH : files.cwd();
console.log("YOLO资源路径: " + currentPath);
// let lock = threads.lock();

YoloV11.prototype.yolov11Init = function () {

    let sopath = currentPath+'/lib/'+android.os.Build.CPU_ABI+'/libyolov11ncnn.so';
    let dexPath = currentPath+'/dex/xiuyi.dex';
    
    console.log("加载SO文件路径: " + sopath);
    console.log("加载DEX文件路径: " + dexPath);
    
    // 检查文件是否存在
    if (!files.exists(sopath)) {
        console.error("SO文件不存在: " + sopath);
        throw new Error("SO文件不存在: " + sopath);
    }
    
    if (!files.exists(dexPath)) {
        console.error("DEX文件不存在: " + dexPath);
        throw new Error("DEX文件不存在: " + dexPath);
    }

    let dirPath = context.getDir("dex", android.app.Activity.MODE_PRIVATE).getAbsolutePath();
    let jniPath = context.getDir("lib", android.app.Activity.MODE_PRIVATE);
    let myFile = new java.io.File(jniPath + "/xiuyi");
    if (!myFile.exists()) {
        myFile.mkdirs();
    } else {
        deleteDirectory(myFile, true);
    }
    // var newjniDir = jniPath + "/" + (new Date() - 0) + "/"; // 转时间戳
    // files.createWithDirs(newjniDir); //创建文件夹
    // var spath = new java.io.File(newjniDir, "libyolov11ncnn.so").getAbsolutePath(); 
    let spath = new java.io.File(myFile, (new Date() - 4) + "/libyolov11.so").getAbsolutePath();
    files.copy(sopath, spath);

    if (!files.exists(spath)) {
        files.copy(sopath, spath);
    }

    console.log("复制SO文件到: " + spath);

    try {
        this.dcl = new Packages.dalvik.system.DexClassLoader(
            dexPath,
            dirPath,
            jniPath,
            java.lang.ClassLoader.getSystemClassLoader()
        );

        let cls = this.dcl.loadClass("com.xiuyi.yolov11ncnn.Yolov11Ncnn");
        console.log("成功加载类: com.xiuyi.yolov11ncnn.Yolov11Ncnn");
        this.YOLOINSTANCE = cls.newInstance();
        this.YOLOINSTANCE.LoadSO(spath, spath);
        // this.allclass={}
        completeInti = true;
    } catch (e) {
        console.error("加载YOLO类失败: " + e);
        throw e;
    }
}

/**
 * yolo模型初始化
 * @param yoloName {String}  模型名
 * @param modolPath {String}  模型路径
 * @param className {String[]}  类别名
 * @param useGPU {boolean?}  是否使用GPU加速
 */
//初始化Yolo
YoloV11.prototype.initYolo = function (yoloName, modolPath, className, cpugpu) {

    // log("58",JSON.parse(className))

    if (Object.keys(allclass).length === 0) {
        //  log("60")
        allclass[yoloName] = className
    } else {

        let keys = Object.keys(allclass);
        if (keys.includes(yoloName)) {
            toastLog('模型重复初始化');
        } else {
            allclass[yoloName] = className
        }
    }


    if (!completeInti) {
        this.yolov11Init();
    }
    try {
        console.log("开始初始化YOLO模型...",yoloName, modolPath, cpugpu);
        //let res = this.YOLOINSTANCE.intiYolo(modelSize, useGPU, paramPath, binPath )
        let res = this.YOLOINSTANCE.initYolo(yoloName, modolPath, cpugpu)

        if (res) {
            log("yolo11初始化成功！！");
        } else {
            log("yolo11初始化失败！！");
        }

    } catch (e) {
        log("92捕获一个错误:" + e.message);
        log("程序继续运行");
        return "初始化失败!";
    }
}


//let classNames; //类别名

/**
 * 执行检测任务
 * @param bitmap {Bitmap}  Bitmap格式图片
 * @param prob {number?}  置信度，默认0.3
 * @param Nms {number?}  非极大值抑制，默认0.45
 * @param imgSize {number?} 图片尺寸[640/320]尺寸越小速度越快，但精度也会降低 
 * @param yoloName {String}  模型名
 * @return {Objects[]}  检测结果
 */
YoloV11.prototype.detect = function (bitmap, prob, Nms, imageSize, yoloName) {
    try {
        
        if (!this.YOLOINSTANCE) {
            console.error("YOLO实例未初始化");
            return [];
        }

        let className2 = allclass[yoloName];
        if (!className2) {
            console.error(`未找到模型名称为 ${yoloName} 的类别信息`);
            return [];
        }

        let res = [];
        let detectRes = this.YOLOINSTANCE.Detect(bitmap, prob, Nms, imageSize, yoloName);
        
        if (detectRes) {
            console.log(`检测到 ${detectRes.length} 个对象`);
            detectRes.forEach(e => {
                res.push(new BoxArr({ x1: e[0], y1: e[1], x2: e[2], y2: e[3], prob: e[4], label: className2[e[5]] }));
            });
        } else {
            console.log("未检测到任何对象");
        }

        return res;
    } catch (e) {
        console.error(`检测过程中发生错误: ${e}`);
        return [];
    }
}

YoloV11.prototype.yoloDraw = function (bbox) {
    let toDraw = bbox.map(box => ({
        region: [box.x1, box.y1, box.x2, box.y2],
        text: box.label + ' ' + sixNum(box.prob, 2)
    }));
    drawinstance.draw(toDraw);

}

YoloV11.prototype.getStatusBarHeight = function () {
    let resources = context.getResources();
    let resourceId = resources.getIdentifier("status_bar_height", "dimen", "android");
    let height = resources.getDimensionPixelSize(resourceId);
    return height;
}


const BoxArr = function (rect) {
    // return;
    this.x1 = 0;
    this.y1 = 0;
    this.x2 = 0;
    this.y2 = 0;
    this.prob = 0;
    this.label = "";
    if (rect != null) {
        this.x1 = Math.round(rect.x1)
        this.y1 = Math.round(rect.y1)
        this.x2 = Math.round(rect.x2)
        this.y2 = Math.round(rect.y2)
        this.prob = sixNum(rect.prob,2)
        this.label = rect.label
    }
}

BoxArr.prototype.center = function () {
    var pos = new Position();
    pos.x = this.x1 + (this.x2 - this.x1) / 2;
    pos.y = this.y1 + (this.y2 - this.y1) / 2;
    return pos;
};

function sixNum(num, retain) {
    var cont = Math.pow(10, retain);
    return parseInt(num * cont) / cont;
}
function Position() {
    this.x = 0;
    this.y = 0;

}
//删除文件函数
function deleteDirectory(dir, flag) {
    if (dir.isDirectory()) {
        let subFiles = dir.listFiles();

        for (let i = 0; i < subFiles.length; i++) {
            let success = deleteDirectory(subFiles[i], true);
            if (!success) {
                return false;
            }
        }
    }
    if (flag) {
        return dir.delete();
    } else {
        return true;
    }
}

module.exports = new YoloV11();