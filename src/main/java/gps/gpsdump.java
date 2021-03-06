/*
 * Copyright Gil THOMAS
 * This file forms an integral part of Logfly project
 * See the LICENSE file distributed with source code
 * for details of Logfly licence project
 */
package gps;

import controller.CarnetViewController;
import controller.FullMapController;
import controller.TraceViewController;
import controller.GPSViewController;
import dialogues.alertbox;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.logging.Level;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.concurrent.Task;
import javafx.concurrent.WorkerStateEvent;
import javafx.event.EventHandler;
import model.Gpsmodel;
import org.controlsfx.dialog.ProgressDialog;
import org.xnap.commons.i18n.I18n;
import settings.configProg;
import systemio.mylogging;
import systemio.textio;

/**
 *
 * @author gil
 * 
 * Use the great GpsDump from http://www.gpsdump.no/
 * 
 * For MacOS, it will use GpsDump 32 or GpsDump 64 depending on the MacOS version
 * 
 * Below MacOs 10.15, GpsDump 32 bit will be used
 * 
 * 
 */
public class gpsdump {
  
    private CarnetViewController carnetController;
    private GPSViewController gpsController;
    private TraceViewController extController;
    private FullMapController mapController;

    // Settings
    private configProg myConfig;
    // Localization
    private I18n i18n; 

    private StringBuilder sbError;
    private int errorGpsDump;    
    private String pathGpsDump;    
    private int codeRetour;      
    private File igcFile;    
    private String CF =  "\r\n"; 
    private String portNumber; 
    private String linuxPort;
    private String macPort;
    private ArrayList<String> listPFM;
    private ObservableList <Gpsmodel> listFlights;   
    private String waypWriteReport = null;
    private boolean mDebug;
    private String gpsdError;
    private enum fineOsType {WINDOWS, MACOS64, MACOS32, LINUX, UNDEFINED}
    private  fineOsType currOS; 
    private String gpsDumpMac64 = "GpsDump64_6";
    private String gpsDumpMac32 = "GpsDump32_54";
    private String gpsDumpWin = "GpsDump_36.exe";
    private String gpsDumpLin = "GpsDump_27";
    

    public gpsdump(String pNamePort, configProg currConfig, I18n pI18n)  {
        this.myConfig = currConfig;
        if (myConfig.isDebugMode())
            mDebug = true;
        else
            mDebug = false;
        i18n = pI18n;
        switch (myConfig.getOS()) {
            case WINDOWS :
                this.currOS = fineOsType.WINDOWS;
                this.portNumber = pNamePort.replace("COM","");   // For Windows we need only the port number 
                break;
            case MACOS :
                String osVersion = System.getProperty("os.version");
                String[] arVersion = osVersion.split("\\.");
                if (arVersion.length > 1) {
                    int iVersion = Integer.parseInt(arVersion[1]);
                    if (iVersion > 14) {
                       this.currOS = fineOsType.MACOS64;   // 10.15 Catalina and above
                    } else {
                        this.currOS = fineOsType.MACOS32; // 10.14 Mojave and below
                    }                    
                } else {
                    this.currOS = fineOsType.MACOS32;
                }
                // something like /dev/cu.usbserial-A7004W23
                // in WinGPS ListSerialPort kept only "/dev/cu."
                macPort = pNamePort.replace("/dev/cu","-cu");  
                break;                   
            case LINUX :
                this.currOS = fineOsType.LINUX;
                String subPort = "ca0";
                if (pNamePort.length() > 8) subPort = pNamePort.substring(0,9);
                switch (subPort) {
                    case "/dev/ttyA":
                        linuxPort = pNamePort.replace("/dev/ttyACM","-ca");  
                        break;
                     case "/dev/ttyS":
                        linuxPort = pNamePort.replace("/dev/ttyS","-c");  
                        break;       
                     case "/dev/ttyU":
                        linuxPort = pNamePort.replace("/dev/ttyUSB","-cu");  
                        break;                            
                }                
        }
    }
    
    public gpsdump(GPSViewController callGPSView, int pRetour, String pNamePort, configProg currConfig, I18n pI18n)  {
        myConfig = currConfig;
        if (myConfig.isDebugMode())
            mDebug = true;
        else
            mDebug = false;
        i18n = pI18n;
        this.gpsController = callGPSView;
        listFlights = FXCollections.observableArrayList();  
        switch (myConfig.getOS()) {
            case WINDOWS :
                this.currOS = fineOsType.WINDOWS;
                this.portNumber = pNamePort.replace("COM","");   // For Windows we need only the port number 
                break;
            case MACOS :
               String osVersion = System.getProperty("os.version");
                String[] arVersion = osVersion.split("\\.");
                if (arVersion.length > 1) {
                    int iVersion = Integer.parseInt(arVersion[1]);
                    if (iVersion > 14) {
                       this.currOS = fineOsType.MACOS64;   // 10.15 Catalina and above
                    } else {
                        this.currOS = fineOsType.MACOS32; // 10.14 Mojave and below
                    }                    
                } else {
                    this.currOS = fineOsType.MACOS32;
                }                
                // something like /dev/cu.usbserial-A7004W23
                // in WinGPS ListSerialPort kept only "/dev/cu."
                macPort = pNamePort.replace("/dev/cu","-cu");  
                break;                
            case LINUX :
                this.currOS = fineOsType.LINUX;
                String subPort = "ca0";
                if (pNamePort.length() > 8) subPort = pNamePort.substring(0,9);
                switch (subPort) {
                    case "/dev/ttyA":
                        linuxPort = pNamePort.replace("/dev/ttyACM","-ca");  
                        break;
                     case "/dev/ttyS":
                        linuxPort = pNamePort.replace("/dev/ttyS","-c");  
                        break;       
                     case "/dev/ttyU":
                        linuxPort = pNamePort.replace("/dev/ttyUSB","-cu");  
                        break;                            
                }                
         }
        codeRetour = pRetour;
    }    
    
    public int getError() {
        return errorGpsDump;
    }    

    public String getGpsdError() {
        return gpsdError;
    }
    
    public ObservableList<Gpsmodel> getListFlights() {
        return listFlights;
    }            

    public String getWaypWriteReport() {
        return waypWriteReport;
    }
        
    public boolean testGpsDump() {
        boolean gpsdumpOK = false;
        
        String executionPath = System.getProperty("user.dir");
        
            switch (currOS) {
                    case MACOS64 :
                        pathGpsDump = executionPath+File.separator+gpsDumpMac64;
                        break;              
                    case MACOS32 :
                        pathGpsDump = executionPath+File.separator+gpsDumpMac32;
                        break;                              
                    case WINDOWS :
                        pathGpsDump = executionPath+File.separator+gpsDumpWin;
                        break;
                    case LINUX :
                        pathGpsDump = executionPath+File.separator+gpsDumpLin;
                        System.out.println(pathGpsDump);
                        break;
            }
            File fGpsDump = new File(pathGpsDump);
            if(fGpsDump.exists()) gpsdumpOK = true;         
                
        return gpsdumpOK;
    }
    
    private static BufferedReader getOutput(Process p) {
        return new BufferedReader(new InputStreamReader(p.getInputStream()));
    }

    private static BufferedReader getError(Process p) {
        return new BufferedReader(new InputStreamReader(p.getErrorStream()));
    }    
    
    private String getTypeGPS(int idGPS) {
        String sTypeGps = "undefined";
        
        switch (idGPS) {
            case 1:
                switch (currOS) {
                    case MACOS32 :
                    case WINDOWS :
                        sTypeGps = "/gps=flymaster";
                        break;
                    case MACOS64 :                        
                    case LINUX : 
                        sTypeGps = "-gyn"; 
                        break;
                }
                break;
            case 2:
                 switch (currOS) {
                    case MACOS32 :
                        sTypeGps = "/gps=flymasterold";
                        break;                     
                    case WINDOWS :                     
                        sTypeGps = "/gps=flymasterold";
                        break;
                    case MACOS64 :    
                    case LINUX : 
                        sTypeGps = "-gy";    // A v??rifier
                        break;
                }
                break;               
            case 3:
                switch (currOS) {
                    case WINDOWS :
                        sTypeGps = "/gps=iqcompeo";	// Compeo/Compeo+/Galileo/Competino/Flytec 5020,5030,6030
                        break;
                    case MACOS32 :
                        sTypeGps = "/gps=flytec";
                        break;                        
                    case MACOS64 :
                    case LINUX :
                        sTypeGps = "-gc";
                        break;                        
                }
                break;
            case 4:
                switch (currOS) {
                    case MACOS32 :
                    case MACOS64 :
                    case WINDOWS : 
                        sTypeGps = "/gps=ascent";
                        break;
                }
                break; 
            case 5:
                switch (currOS) {
                    case MACOS32 :
                    case MACOS64 :      /// A v??rifier
                    case WINDOWS : 
                        sTypeGps = "/gps=syride";
                        break;
                    case LINUX :
                        sTypeGps = "-gsy";
                        break;                        
                }
                break;
            case 6:
                switch (currOS) {
                    case MACOS32 :
                    case MACOS64 :
                    case WINDOWS :                 
                        sTypeGps = "/gps=leonardo";
                        break;
                }
                break; 
            case 7:
                switch (currOS) {
                    case MACOS32 :
                    case MACOS64 :
                    case WINDOWS : 
                        sTypeGps = "/gps=digiflyair";
                        break;
                }
                break;   
            case 8:
                switch (currOS) {
                    case WINDOWS :
                        sTypeGps = "/gps=iqbasic";	// IQ-Basic / Flytec 6015
                        break;
                    case MACOS32 :
                        sTypeGps = "/gps=iqbasic";  
                        break;                        
                    case MACOS64 :
                    case LINUX :
                        sTypeGps = "-giq";
                        break;
                }
                break;                
        }        
        
        return sTypeGps;
    }
    
    private boolean getExecutionPath() {
        boolean res = false;
        
        String executionPath = System.getProperty("user.dir");
        switch (currOS) {
            case WINDOWS :
                // to do windows path testing
                pathGpsDump = executionPath+File.separator+gpsDumpWin;    // Windows
                File fwGpsDump = new File(pathGpsDump);
                if(fwGpsDump.exists()) res = true;         
                break;                
            case MACOS32 :
                pathGpsDump = executionPath+File.separator+gpsDumpMac32;
                File fm32GpsDump = new File(pathGpsDump);
                if(fm32GpsDump.exists()) res = true;  
                break;                    
            case MACOS64 :
                pathGpsDump = executionPath+File.separator+gpsDumpMac64;
                File fm64GpsDump = new File(pathGpsDump);
                if(fm64GpsDump.exists()) res = true;  
                break;
            case LINUX :
                pathGpsDump = executionPath+File.separator+gpsDumpLin;
                System.out.println(pathGpsDump);
                File flGpsDump = new File(pathGpsDump);
                if(flGpsDump.exists()) res = true;                        
                break;                    
        }  
        
        return res;
    }

    /**
     * Windows call need more parameters
     *    -  /com="Port number"
     *    -  /igc_log="File name or folder name"
     *    -  /win="Window option"  Select how GpsDump shall be shown (0=Hide, 1=Minimized, 2=Show)
     *    - /exit   Used to make GpsDump exit after doing the job.
     * @param idGPS
     * @param idFlight
     * @return 
     */
    private int getFlight(int idGPS, int idFlight)  {
        int res = -1; 
        String[] arrayParam = null;
        boolean gpsDumpOK = false;
        String wNoWin = "/win=0";  
        String wComPort = "/com="+portNumber;
        String wExit = "/exit";               
        StringBuilder sbLog = new StringBuilder();
        String sTypeGps = getTypeGPS(idGPS);
        igcFile = systemio.tempacess.getAppFile("Logfly", "temp.igc");
        if (igcFile.exists())  igcFile.delete();              
        String numberIGC = null;
        // Index track is different in Mac 
        switch (currOS) {
            case MACOS32 :
                numberIGC = "/track="+String.valueOf(idFlight+1);
                break;            
            case WINDOWS :
                switch (idGPS) {
                        case 1 :
                            // Flymaster
                            numberIGC = "/track="+String.valueOf(idFlight+1);     
                            break;
                        case 2 :
                            // Flymaster Old
                            numberIGC = "/track="+String.valueOf(idFlight);    
                            break;    
                        case 3 :
                            // 6020 6030
                            numberIGC = "/track="+String.valueOf(idFlight);   
                            break;
                        case 8: 
                            // 6015 
                            numberIGC = "/track="+String.valueOf(idFlight);
                            break;
                    }                      
                break;
            case MACOS64 :    
            case LINUX :
                    switch (idGPS) {
                        case 1 :
                            // Flymaster
                            numberIGC = "-f"+String.valueOf(idFlight+1);       
                            break;
                        case 2 :
                            // Flymaster Old
                            numberIGC = "-f"+String.valueOf(idFlight+1);       
                            break;    
                        case 3 :
                            // 6020 6030
                            numberIGC = "-f"+String.valueOf(idFlight+1);       
                            break;
                        case 8: 
                            // 6015 
                            // Non r??solu pour le premier vol qui est num??rot?? 0 
                            // donc on obtient la liste et une attente clavier
                            numberIGC = "-f"+String.valueOf(idFlight+1); 
                            break;
                    }              
                break;
        }

        try {
            gpsDumpOK = getExecutionPath();
            if (gpsDumpOK) {
                // http://labs.excilys.com/2012/06/26/runtime-exec-pour-les-nuls-et-processbuilder/
                // the author has serious doubts : ok only if program run correctly or crashes
                switch (currOS) {
                    case WINDOWS :
                        String logIGC = "/igc_log="+igcFile.getAbsolutePath();  
                        arrayParam = new String[]{pathGpsDump,wNoWin,wComPort,sTypeGps, logIGC, numberIGC, wExit};
                        break;
                    case MACOS32 : 
                        String name32IGC = "/name="+igcFile.getAbsolutePath();   
                        arrayParam =new String[]{pathGpsDump,sTypeGps, name32IGC, numberIGC};
                        break;                        
                    case MACOS64 : 
                        String name64IGC = "-l"+igcFile.getAbsolutePath();   
                        arrayParam =new String[]{pathGpsDump,sTypeGps, macPort, name64IGC, numberIGC};
                        break;
                    case LINUX : 
                        String tempIGC = "-l"+igcFile.getAbsolutePath();   
                        arrayParam =new String[]{pathGpsDump,sTypeGps, linuxPort, tempIGC, numberIGC};
                        break;                        
                }
                if (mDebug) {
                    mylogging.log(Level.INFO, java.util.Arrays.toString(arrayParam));
                }
                Process p = Runtime.getRuntime().exec(arrayParam);   
                p.waitFor();
                res = p.exitValue();  // 0 if all is OK  
                // Sometimes, a flight is missing
                // Log report temp.igc missing
                // We try to wait one second 
                
                String ligne = ""; 
                if (res == 0) {
                    BufferedReader output = getOutput(p);                    
                    if (mDebug) {
                        mylogging.log(Level.INFO, "res = 0");
                    }
                } else {
                    BufferedReader error = getError(p);
                    StringBuilder sbBuffered = new StringBuilder();
                    sbBuffered.append("res = ").append(String.valueOf(res)).append(CF);
                    while ((ligne = error.readLine()) != null) {
                        sbBuffered.append(ligne).append(CF);
                    }
                    if (mDebug) {                        
                        mylogging.log(Level.INFO, sbBuffered.toString());
                    }
                }
            } else {
                res = 1201;
                errorGpsDump = 1201;                
            }    
        } catch (FileNotFoundException ex) {
            res = 1;
            errorGpsDump = 1;
        } catch (IOException ex) {
            res = 2;
            errorGpsDump = 2;       
        } catch (InterruptedException ex) {
            res = 6;
            errorGpsDump = 6;   
        } catch (NullPointerException ex) {
            res = 5;
            errorGpsDump = 5;
        } 
        
        return res;                          
    }    
    
    public String directFlight(int idGPS, int idFlight)  { 
        String res = null;
        try {
            int resDown = getFlight(idGPS,idFlight);
            if (resDown == 0 && igcFile.exists()) {
                // We want to check GPSDump communication
                if (mDebug) {
                    String s = igcFile.getAbsolutePath()+" exist";
                    mylogging.log(Level.INFO,s);
                }
                textio fread = new textio();                                    
                res = fread.readTxt(igcFile);
            } else {
                sbError = new StringBuilder("Exception in directFlight - resDown = ").append(String.valueOf(resDown));
                mylogging.log(Level.SEVERE, sbError.toString());
            }
        } catch (Exception e) {
            sbError = new StringBuilder("===== GPSDump Error =====\r\n");
            sbError = sbError.append(this.getClass().getName()+"."+Thread.currentThread().getStackTrace()[1].getMethodName());
            mylogging.log(Level.SEVERE, sbError.toString());
        }
                
        return res;
    }
    
    public void askFlightsList(int idGPS) {
        
        int res = getRawList(idGPS);
        
        if (res ==0) {            
            switch (currOS) {
                    case WINDOWS :
                        winListFormatting();
                        break;
                    case MACOS32 :
                        macListFormatting(idGPS);
                        break;
                    case MACOS64 :
                        // GPSDump Mac 64 bit is a port from the Linux version
                        linuxListFormatting(idGPS);
                        break;
                    case LINUX : 
                        linuxListFormatting(idGPS);
                        break;
                }
        } 
    }     
    
    /**
     * A line is : 2019.08.10,17:33:03,0:01:36
     */
    private void winListFormatting() {
        int nbFlights = 0;
        
        for (int i = 0; i < listPFM.size(); i++) {
            String ligPFM = listPFM.get(i);    
            // Sample : 2019.08.14,13:13:32,0:27:25
            Pattern pDate = Pattern.compile("\\d{2}.\\d{2}.\\d{2}");
            Matcher mDate = pDate.matcher(ligPFM);
            if (mDate.find()) {   
                // date is reverses 
                String sDate = mDate.group(0).substring(6)+ mDate.group(0).substring(2,6)+ mDate.group(0).substring(0,2);
                nbFlights++;
                String sTime = null;
                String sDur = null;
                // dur??e vol sup??rieure ?? 9 heures 59 -> 2019.08.03,17:39:54,11:12:15
                Pattern pTime2 = Pattern.compile("\\d{2}:\\d{2}:\\d{2},\\d{2}:\\d{2}:\\d{2}");
                Matcher mTime2 = pTime2.matcher(ligPFM);                    
                if (mTime2.find()) {
                    sTime = mTime2.group(0).substring(0,8); 
                    sDur = mTime2.group(0).substring(9);                         
                } else {
                    // dur??e vol inf??rieure ?? 9 heures 59 -> 2019.08.10,17:33:03,0:01:36
                    Pattern pTime1 = Pattern.compile("\\d{2}:\\d{2}:\\d{2},\\d{1}:\\d{2}:\\d{2}");
                    Matcher mTime1 = pTime1.matcher(ligPFM);                    
                    if (mTime1.find()) {
                        sTime = mTime1.group(0).substring(0,8); 
                        sDur = mTime1.group(0).substring(9);  
                    }
                }
                // System.out.println(sDate+" "+sTime+" "+sDur);
                Gpsmodel oneFlight = new Gpsmodel();                                             
                oneFlight.setChecked(false);
                oneFlight.setDate(sDate);
                oneFlight.setHeure(sTime);
                oneFlight.setCol4(sDur);
                oneFlight.setCol5(null);                
                listFlights.add(oneFlight);                
            }                
        }
        if (nbFlights == 0) {
            sbError = new StringBuilder();
            for (int i = 0; i < listPFM.size(); i++) {                
                sbError.append(listPFM.get(i)).append(CF);                
            }              
            System.out.println("Sb error "+sbError.toString());
            gpsdError = sbError.toString();
        }        
    }
    
    private void linuxListFormatting(int idGPS) {
        int nbFlights = 0;
        
        for (int i = 0; i < listPFM.size(); i++) {
            String ligPFM = listPFM.get(i);    
            Pattern pDate = Pattern.compile("\\d{2}.\\d{2}.\\d{2}");
            Matcher mDate = pDate.matcher(ligPFM);
            if (mDate.find()) {   
                // date is reverses 
                String sDate = mDate.group(0);
                nbFlights++;
                String sTime = null;
                String sDur = null;
                switch (idGPS) {
                    case 1 :
                    case 2 :
                    case 3 :                        
                        // Sample :  1   14.08.19   13:13:32   00:27:25
                        Pattern pTime = Pattern.compile("\\d{2}:\\d{2}:\\d{2}\\s\\s\\s\\d{2}:\\d{2}:\\d{2}");
                        Matcher mTime = pTime.matcher(ligPFM);                    
                        if (mTime.find()) {
                            sTime = mTime.group(0).substring(0,8); 
                            sDur = mTime.group(0).substring(11);                         
                        } 
                        break;
                    case 8 :
                        // Sample
                        // 6015, SW 1.3.07, S/N 1068
                        // Track list:
                        // 1; 19.07.19; 07:37:24;        2; 00:18:05;  
                        // 2; 19.07.14; 07:52:45;        2; 00:11:33;  
                        // Date is inverted
                        String goodDate = sDate.substring(6,8)+sDate.substring(2,5)+"."+sDate.substring(0,3);
                        sDate = goodDate;
                        Pattern p8 = Pattern.compile("\\d{2}:\\d{2}:\\d{2}{2}");
                        Matcher m8 = p8.matcher(ligPFM);  
                        // on est oblig?? de se le faire comme ??a en java8
                        // https://stackoverflow.com/questions/7378451/how-can-i-count-the-number-of-matches-for-a-regex
                        int count = 0;
                        while(m8.find()) {
                            count++;
                            switch (count) {
                                case 1 :
                                    sTime = m8.group(0);
                                    break;
                                case 2 :
                                    sDur = m8.group(0);
                                    break;
                            }       
                        }                        
                        break;                        

                }
                System.out.println(sDate+" "+sTime+" "+sDur);
                Gpsmodel oneFlight = new Gpsmodel();                                             
                oneFlight.setChecked(false);
                oneFlight.setDate(sDate);
                oneFlight.setHeure(sTime);
                oneFlight.setCol4(sDur);
                oneFlight.setCol5(null);                
                listFlights.add(oneFlight);                
            }                
        }
        if (nbFlights == 0) {
            sbError = new StringBuilder();
            for (int i = 0; i < listPFM.size(); i++) {                
                sbError.append(listPFM.get(i)).append(CF);                
            }              
            System.out.println("Sb error "+sbError.toString());
            gpsdError = sbError.toString();
        }         
    }
    
    /**
     * 
     * @param idGPS 
     * 
     * Deprecated, used with GPSDump 32 bit
     * 
     */    
    private void macListFormatting(int idGPS) {
        int nbFlights = 0;
        
        for (int i = 0; i < listPFM.size(); i++) {
            String ligPFM = listPFM.get(i);            
            Pattern pDate = Pattern.compile("Flight date\\s\\d{2}.\\d{2}.\\d{2}");
            Matcher mDate = pDate.matcher(ligPFM);
            if (mDate.find()) {  
                String sDate = mDate.group(0).substring(12);
                if (idGPS == 8) {
                    sDate = mDate.group(0).substring(18)+mDate.group(0).substring(14,17)+"."+mDate.group(0).substring(12,14);
                }
                nbFlights++;
                String sTime = null;
                String sDur = null;
                Pattern pTime = Pattern.compile("time\\s\\d{2}:\\d{2}:\\d{2}");
                Matcher mTime = pTime.matcher(ligPFM);
                if (mTime.find()) {
                    sTime = mTime.group(0).substring(5);
                    Pattern pDur = Pattern.compile("duration\\s\\d{2}:\\d{2}:\\d{2}");

                    Matcher mDur = pDur.matcher(ligPFM);
                    if (mDur.find()) {
                        sDur = mDur.group(0).substring(9);
                    }
                }
                Gpsmodel oneFlight = new Gpsmodel();                                             
                oneFlight.setChecked(false);
                oneFlight.setDate(sDate);
                oneFlight.setHeure(sTime);
                oneFlight.setCol4(sDur);
                oneFlight.setCol5(null);                
                listFlights.add(oneFlight);                
            }             
        }
        if (nbFlights == 0) {
            sbError = new StringBuilder();
            sbError.append("GPSDump error").append(" :").append(CF);    
            for (int i = 0; i < listPFM.size(); i++) {                
                sbError.append(listPFM.get(i)).append(CF);                
            }              
            System.out.println(sbError.toString());
            gpsdError = sbError.toString();
        }                
    }
    
    private int getRawList(int idGPS)  {   
        
        int res = -1; 
        String[] arrayParam = null;
        boolean gpsDumpOK = false;
        String numberIGC = "";
        String wNoWin = "/win=0";  
        String wExit = "/exit";        
        File listFile = systemio.tempacess.getAppFile("Logfly", "temp.txt");
        if (listFile.exists())  listFile.delete();          
        String sNotify = "/notify="+listFile.getAbsolutePath();
        String wComPort = "/com="+portNumber;
        String sOverw = "/overwrite";      
        String sAction = "";
        StringBuilder sbLog = new StringBuilder();
        String sTypeGps = getTypeGPS(idGPS);
        switch (currOS) {
            case MACOS32 :
                sAction = "/flightlist";
                break;            
            case WINDOWS :
                sAction = "/flightlist";
                break;
            case MACOS64 :
            case LINUX :
                // -f???N??? Select a specific flight (Brauniger/Flytec/Flymaster). If N=0 a flightlist is displayed.
                numberIGC = "-f0";
                break;
        }        
        try {
            gpsDumpOK = getExecutionPath();
            if (gpsDumpOK) {
                listPFM =new ArrayList<String>();
                String tempList = "-l"+listFile.getAbsolutePath(); 
                // http://labs.excilys.com/2012/06/26/runtime-exec-pour-les-nuls-et-processbuilder/
                // the author has serious doubts : ok only if program run correctly or crashes
                switch (currOS) {
                    case WINDOWS :
                        //  wComPort is useless
                         arrayParam = new String[]{pathGpsDump,wNoWin, wComPort, sTypeGps, sAction, sNotify, sOverw,wExit};
                       // arrayParam = new String[]{pathGpsDump,wNoWin, sTypeGps, sAction, sNotify, sOverw,wExit};
                        break;
                    case MACOS32 : 
                        arrayParam =new String[]{pathGpsDump,sTypeGps, sAction};                        
                        break;                        
                    case MACOS64 : 
                        // result is displayed on the screen but a file path is required  
                        arrayParam =new String[]{pathGpsDump,sTypeGps, macPort, tempList, numberIGC};
                        break;                           
                    case LINUX :   
                        // result is displayed on the screen but a file path is required
                        arrayParam =new String[]{pathGpsDump,sTypeGps, linuxPort, tempList, numberIGC};
                        break;                        
                }
                if (mDebug) {
                    mylogging.log(Level.INFO, java.util.Arrays.toString(arrayParam));
                }
                Process p = Runtime.getRuntime().exec(arrayParam);   
                p.waitFor();
                res = p.exitValue();  // 0 if all is OK  
                switch (currOS) {
                    case WINDOWS :
                        if (res == 0) {
                            if (mDebug) {
                                mylogging.log(Level.INFO, "res = 0");
                            }
                            if (listFile.exists()) {
                                try {
                                    InputStream flux=new FileInputStream(listFile); 
                                    InputStreamReader lecture=new InputStreamReader(flux);
                                    BufferedReader buff=new BufferedReader(lecture);
                                    String ligne;
                                    while ((ligne=buff.readLine())!=null){
                                        listPFM.add(ligne);
                                    }
                                    buff.close(); 		
                                } catch (Exception e) {
                                    res = 1;
                                    sbError = new StringBuilder(this.getClass().getName()+"."+Thread.currentThread().getStackTrace()[1].getMethodName());                                    
                                    sbError.append("\r\n").append(e.toString());
                                    sbError.append("\r\n").append("Problem to read flightlist file");
                                    if (mDebug) {
                                        mylogging.log(Level.INFO, "res = 1 Problem to read flightlist file");
                                    }                                    
                                }
                            } else {
                                sbError = new StringBuilder("===== GPSDump return Error : No flight list =====\r\n");
                                sbError = sbError.append(sbLog.toString());
                                mylogging.log(Level.INFO, sbError.toString());                          
                            }                                 
                        } else {
                            sbError = new StringBuilder("===== GPSDump return Error : No response from GPS =====\r\n");
                            sbError = sbError.append(sbLog.toString());
                            mylogging.log(Level.INFO, sbError.toString());
                        }    
                        break;
                    case MACOS32 : 
                        String ligne32 = ""; 
                        if (res == 0) {
                            BufferedReader output = getOutput(p);                    
                            while ((ligne32 = output.readLine()) != null) {
                                listPFM.add(ligne32);
                            }
                        } else {
                            BufferedReader error = getError(p);
                            while ((ligne32 = error.readLine()) != null) {
                                listPFM.add(ligne32);
                            }
                        }                                               
                        break;                        
                    case MACOS64 : 
                        String ligne64 = ""; 
                        if (res == 255 || res == 0) {
                            // GPSDump returned a flightlist with an error code : Flight number out of range 
                            res = 0;
                            BufferedReader output = getOutput(p);                    
                            while ((ligne64 = output.readLine()) != null) {
                                if (mDebug) {
                                    System.out.println(ligne64);
                                    listPFM.add(ligne64);
                                }
                            }
                            if (mDebug) {
                                mylogging.log(Level.INFO, "res = 0 litstPFM.size = "+String.valueOf(+listPFM.size()));
                            }                            
                        } else {
                            BufferedReader error = getError(p);
                            while ((ligne64 = error.readLine()) != null) {
                                listPFM.add(ligne64);
                            }                            
                            sbError = new StringBuilder("===== GPSDump return Error : ").append(String.valueOf(res));                           sbError = sbError.append(sbLog.toString());
                            mylogging.log(Level.INFO, sbError.toString());                          
                        }                                               
                        break;
                    case LINUX :                         
                        String ligne = ""; 
                        if (res == 255) {
                            // GPSDump returned a flightlist with an error code : Flight number out of range 
                            res = 0;
                            BufferedReader output = getOutput(p);                    
                            while ((ligne = output.readLine()) != null) {
                                if (mDebug) {
                                    System.out.println(ligne);
                                }
                                listPFM.add(ligne);
                            }
                            if (mDebug) {
                                mylogging.log(Level.INFO, "res = 0 litstPFM.size = "+String.valueOf(+listPFM.size()));
                            }
                        } else {
                            BufferedReader error = getError(p);
                            while ((ligne = error.readLine()) != null) {
                                listPFM.add(ligne);
                            }
                        }                                               
                        break;   
                }                
            } else {
                sbLog.append("Error 1201 ").append(CF);
                res = 1201;
                errorGpsDump = 1201;                
            }    
        } catch (Exception ex) {
            sbLog.append("Error 1 ").append(CF);
            res = 1;
            errorGpsDump = 1;
        }  
        
        gpsdError = sbLog.toString();
        return res;            
        
    } 
    
     public int getOziWpt(int idGPS, File wptFile)  {   
        
        int res = -1; 
        if (wptFile.exists())  wptFile.delete();  
        String[] arrayParam = null;
        boolean gpsDumpOK = false;
        String numberIGC = "";
        String wNoWin = "/win=0";  
        String wExit = "/exit";                
        String wComPort = "/com="+portNumber;
        String sOverw = "/overwrite";     
        String sAction = "";
        String macType = "/wpttype=ozi";
        String macFile = "/wptname="+wptFile.getAbsolutePath();
        StringBuilder sbLog = new StringBuilder();
        String sTypeGps = getTypeGPS(idGPS);
        switch (currOS) {
            case MACOS32 :
                sAction = "/rdwpt";
                break;            
            case WINDOWS :
                sAction = "/rd_wpt="+wptFile.getAbsolutePath();
                break;
            case MACOS64 :    
            case LINUX :
                sAction = "-w"+wptFile.getAbsolutePath();
                break;
        }        
        try {
            gpsDumpOK = getExecutionPath();
            if (gpsDumpOK) {
                listPFM =new ArrayList<String>();
                // http://labs.excilys.com/2012/06/26/runtime-exec-pour-les-nuls-et-processbuilder/
                // the author has serious doubts : ok only if program run correctly or crashes
                switch (currOS) {
                    case WINDOWS :
                        arrayParam = new String[]{pathGpsDump,wNoWin, wComPort, sTypeGps, sAction, sOverw,wExit};
                        break;
                    case MACOS32 : 
                        arrayParam =new String[]{pathGpsDump,sTypeGps, sAction, macType, macFile};                        
                        break;                        
                    case MACOS64 : 
                        //arrayParam =new String[]{pathGpsDump,sTypeGps, sAction, macType, macFile};    
                        arrayParam =new String[]{pathGpsDump,sTypeGps, macPort, sAction};
                        break;
                    case LINUX :    
                        arrayParam =new String[]{pathGpsDump,sTypeGps, linuxPort, sAction};
                        break;                        
                }
                System.out.println(java.util.Arrays.toString(arrayParam));
                if (mDebug) {
                    mylogging.log(Level.INFO, java.util.Arrays.toString(arrayParam));
                }
                Process p = Runtime.getRuntime().exec(arrayParam);   
                p.waitFor();
                res = p.exitValue();  // 0 if all is OK  
                System.out.println("res = "+res);
                String ligne = ""; 
                if (res == 0) {
                    BufferedReader output = getOutput(p);                    
                    if (mDebug) {
                        mylogging.log(Level.INFO, "res = 0");
                    }
                } else {
                    BufferedReader error = getError(p);
                    while ((ligne = error.readLine()) != null) {
                        sbLog.append(ligne).append(CF);
                    }                      
                    mylogging.log(Level.SEVERE, sbLog.toString());
                }             
            } else {
                sbLog.append("Error 1201 ").append(CF);
                res = 1201;
                errorGpsDump = 1201;                
            }    
        } catch (Exception ex) {
            sbLog.append("Error 1 ").append(CF);
            res = 1;
            errorGpsDump = 1;
        } finally {
            gpsdError = sbLog.toString();
        } 
        
        return res;                    
    }    

    public int setOziWpt(int idGPS, String pPath, int gpsTypeName)  {   
        
        int res = -1;   
        String[] arrayParam = null;
        File wptFile = new File(pPath);
        boolean gpsDumpOK = false;
        String numberIGC = "";
        String wNoWin = "/win=0";  
        String wExit = "/exit";                
        String wComPort = "/com="+portNumber;      
        String sAction = "";
        String macType = "/wpttype=ozi";
        String macFile = "/wptname="+wptFile.getAbsolutePath();
        StringBuilder sbLog = new StringBuilder();
        StringBuilder sbRep = new StringBuilder();
        String sTypeGps = getTypeGPS(idGPS);
        switch (currOS) {
            case WINDOWS :
                switch (gpsTypeName) {
                    case 0:    // long name  
                    case 1 :   // short name
                        sAction = "/wr_wpt="+wptFile.getAbsolutePath();
                        break;
                    case 2 :      // mixed name
                        sAction = "/wr_wpt2="+wptFile.getAbsolutePath();
                        break;
                }                    
                break;
            case MACOS32 :
                sAction = "/wrwpt";
                break;                
            case MACOS64 :                
            case LINUX :
                sAction ="-r"+wptFile.getAbsolutePath();
                break;
        }        
        try {
            gpsDumpOK = getExecutionPath();
            if (gpsDumpOK) {
                listPFM =new ArrayList<String>();
                // http://labs.excilys.com/2012/06/26/runtime-exec-pour-les-nuls-et-processbuilder/
                // the author has serious doubts : ok only if program run correctly or crashes
                switch (currOS) {
                    case WINDOWS :
                        arrayParam = new String[]{pathGpsDump,wNoWin, wComPort, sTypeGps, sAction, wExit};
                        break;
                    case MACOS32 : 
                        arrayParam =new String[]{pathGpsDump,sTypeGps, sAction, macType, macFile};                        
                        break;                        
                    case MACOS64 : 
                        arrayParam =new String[]{pathGpsDump,sTypeGps, macPort, sAction};                        
                        break;
                    case LINUX :   
                        arrayParam =new String[]{pathGpsDump,sTypeGps, linuxPort, sAction};
                        break;                        
                }
                if (mDebug) {
                    mylogging.log(Level.INFO, java.util.Arrays.toString(arrayParam));
                }
                Process p = Runtime.getRuntime().exec(arrayParam);   
                p.waitFor();
                res = p.exitValue();  // 0 if all is OK  
                String ligne = ""; 
                if (res == 0) {
                    // even in case of error the returned code by GPSDump is 0
                    BufferedReader output = getOutput(p);                    
                    while ((ligne = output.readLine()) != null) {
                        sbRep.append(ligne).append(CF);
                    }
                    if (mDebug) {
                        mylogging.log(Level.INFO, "res = 0");
                    }
                } else {
                    BufferedReader error = getError(p);
                    while ((ligne = error.readLine()) != null) {
                        sbLog.append(ligne).append(CF);
                        sbRep.append(ligne).append(CF);
                    }
                    mylogging.log(Level.SEVERE, sbLog.toString());
                }
                waypWriteReport = sbRep.toString();
            } else {
                sbLog.append("Error 1201 ").append(CF);
                res = 1201;
                errorGpsDump = 1201;                
            }    
        } catch (Exception ex) {
            sbLog.append("Error 1 ").append(CF);
            res = 1;
            errorGpsDump = 1;
        } finally {
            gpsdError = sbLog.toString();
        }
        return res;            
        
    }         
     
    public void start(int idGPS, int idFlight)  {                        
        Task<Object> worker = new Task<Object>() {
            @Override
            protected Object call() throws Exception {
                int res = getFlight(idGPS,idFlight);
                return null ;                
            }
        
        };
        
        worker.setOnSucceeded(new EventHandler<WorkerStateEvent>() {
            @Override
            public void handle(WorkerStateEvent t) {
                gpsdumpClose();
            }
        });        

        ProgressDialog dlg = new ProgressDialog(worker);
        dlg.setHeaderText(i18n.tr("GPS import"));
        dlg.setTitle("");

        Thread th = new Thread(worker);
        th.setDaemon(true);
        th.start();       
    }    
    
    private void gpsdumpClose() {
        if (errorGpsDump ==0 ) 
            switch (codeRetour) {
                case 0:
                    // test case
                    System.out.println("OK...");
                    break;
                case 1:
                   // carnetController.returnXXX
                    break;
                case 2:
                   // carnetController.returnXXX
                    break;
                case 3:
                   // extController.returnXXX
                    break;
                case 4:
                   // extController.returnXXX
                    break;    
                case 5:
                   // mapController.returnXXX
                    break;  
                case 6:
                    // GPSViewController ask for one track with progress bar
                    String strIGC = null;
                    try {
                        textio fread = new textio();                                    
                        strIGC = fread.readTxt(igcFile);
                        gpsController.returnGpsDump(strIGC);
                    } catch (Exception e) {
                        
                    }
                    break;                        
            }
        else {
            alertbox aError = new alertbox(myConfig.getLocale());
            aError.alertNumError(errorGpsDump);
        }
    }    
    
}
