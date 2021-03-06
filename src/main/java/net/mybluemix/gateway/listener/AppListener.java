
package net.mybluemix.gateway.listener;
import com.mongodb.MongoClient;
import com.mongodb.MongoClientOptions;
import com.mongodb.MongoClientURI;
import net.mybluemix.gateway.authenticator.LoginAuthProvider;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

/**
 * Populates the dataSource in a servlet context.
 */
public class AppListener implements ServletContextListener {

    /**
     * Populates the dataSource in a servlet context.
     * @param sce the servlet context event
     */
    @Override
	public void contextInitialized(ServletContextEvent sce) {

		ServletContext sc = sce.getServletContext();

		String s = sc.getRealPath("./WEB-INF/classes/mongostore");
		System.setProperty("javax.net.ssl.trustStore", s);
		System.setProperty("javax.net.ssl.trustStorePassword", "gatewaydrug");

		// go to Bluemix for information about connection credentials
		MongoClientURI uri = new MongoClientURI("mongodb://admin:XFEXEQSJSHMCSVSE@sl-us-dal-9-portal.3.dblayer.com:17281,sl-us-dal-9-portal.0.dblayer.com:17281/admin?ssl=true");
		MongoClient client = new MongoClient(uri);
		sc.setAttribute("datasource", client);

		LoginAuthProvider lap = new LoginAuthProvider();
		lap.setServletContext(sc);
	}

	@Override
	public void contextDestroyed(ServletContextEvent cse) {
	}
}

