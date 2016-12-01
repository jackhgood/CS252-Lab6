
package net.mybluemix.gateway.listener;
import com.mongodb.MongoClient;
import com.mongodb.MongoClientOptions;
import com.mongodb.MongoClientURI;
import com.mongodb.connection.SslSettings;
import com.mongodb.connection.netty.NettyStreamFactoryFactory;

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
		// go to Bluemix for information about connection credentials
//		MongoClientURI uri = new MongoClientURI("mongodb://admin:XFEXEQSJSHMCSVSE@sl-us-dal-9-portal.3.dblayer.com:17281,sl-us-dal-9-portal.0.dblayer.com:17281/admin?ssl=true&sslInvalidHostNameAllowed=true");
//		MongoClient client = new MongoClient(uri);
//		sc.setAttribute("datasource", client);
	}

	@Override
	public void contextDestroyed(ServletContextEvent cse) {
	}
}
